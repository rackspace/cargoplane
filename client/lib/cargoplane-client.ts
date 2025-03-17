import { Observable, Subject } from "rxjs";
import { auth, mqtt5, iot } from "aws-iot-device-sdk-v2/dist/browser.js";

const MillisecondsInMinute = 60000;

/**
 * Approved credentials for use by this client instance.
 */
export interface CargoplaneCredential {
  iotEndpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  sessionToken: string;
  /** ISO-8601 date-time of when the credentials expire - normally one hour after issuing */
  expiration: string;
}

/**
 * Cargo payload message delivery Quality of Service.
 *
 * Enum values match [MQTT5 spec](https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html#_Toc3901234) encoding values.
 * @see https://docs.aws.amazon.com/iot/latest/developerguide/mqtt.html#mqtt-qos
 */
export enum QoS {
  /**
   * The message is delivered according to the capabilities of the underlying network. No response is sent by the
   * receiver and no retry is performed by the sender. The message arrives at the receiver either once or not at all.
   * This level should be used for messages that are sent over reliable communication links or that can be missed
   * without a problem. It requires minimal network overhead.
   */
  AtMostOnce = mqtt5.QoS.AtMostOnce,

  /**
   * A level of service that ensures that the message arrives at the receiver at least once.
   * The message is not considered complete until the sender receives a response indicating successful delivery.
   * This requires more network overhead than `AtMostOne`
   */
  AtLeastOnce = mqtt5.QoS.AtLeastOnce,
}

/** Message queued for publishing */
interface QueuedMessage {
  topic: string;
  message?: unknown;
  qos: QoS;
}

/**
 * Specialized version of setTimer():
 * - Emits events
 * - Checks actual wall time, not just clock ticks
 * - Detects discrepancy which indicates the CPU had been suspended.
 */
class ClockTimer {
  private timer?: NodeJS.Timeout;
  private event$?: Subject<Event>;
  private expiringTime = 0;
  private lastMinuteTime = 0;

  /**
   * Set timer
   * @param expiringTime emit 'expiring' event around this time: milliseconds since epoch
   * @param outputEvents$ stream to emit to
   */
  set(expiringTime: number, outputEvents$: Subject<Event>) {
    this.event$ = outputEvents$;
    this.expiringTime = expiringTime;
    this.lastMinuteTime = Date.now();
    this.timer = setInterval(() => this.checkClock(), MillisecondsInMinute);
  }

  /** Clear/stop timer */
  clear() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.event$ = undefined;
  }

  private checkClock() {
    if (this.timer) {
      const now = Date.now();
      if (now - this.lastMinuteTime > 2 * MillisecondsInMinute) {
        this.event$ && this.event$.next(new Event("clock-resume"));
      }
      if (now >= this.expiringTime) {
        this.event$ && this.event$.next(new Event("expiring"));
      }
      this.lastMinuteTime = now;
    }
  }
}

/** Any Cargo payload - always an object */
type GenericPayload = Record<string, unknown>;

/**
 * Helper to decode message payloads from IoT Core.
 */
class PayloadParser {
  private decoder = new TextDecoder();

  /**
   * Parse IoT Payload into an object.
   * @throws SyntaxError if message is not valid JSON
   */
  parse(payload: mqtt5.Payload | undefined): GenericPayload {
    if (typeof payload === "string") {
      return JSON.parse(payload);
    } else if (typeof payload === "object") {
      if ("byteLength" in payload) {
        return JSON.parse(this.decoder.decode(payload as ArrayBufferView));
      } else {
        return payload; // Record<string,unknown>
      }
    } else {
      return {}; // undefined
    }
  }
}

/**
 * Web browser-side API for Cargoplane.
 * Must use as a singleton.
 *
 * Credentials must be obtained via `CargoplaneCloud#createCredentials` via code running
 * in AWS. Note that the credentials include an expiration date-time.
 *
 * You must obtain new credentials and reconnect prior to expiration in order to remain
 * connected. Subscriptions are automatically re-applied upon reconnect. The expiration
 * period is normally one hour, but it is best to use this value rather than assume one
 * hour.
 */
export class CargoplaneClient {
  /** Map of message type to RxJs subjects */
  private readonly typeSubjects = new Map<string, Subject<GenericPayload>>();

  private client?: mqtt5.Mqtt5Client;
  private clientOnline = false;
  private publishQueue: QueuedMessage[] = [];
  private connectionEvent$?: Subject<Event>;
  private clock = new ClockTimer();
  private payloadParser = new PayloadParser();

  /**
   * Is the service currently connected to the cloud?
   */
  isOnline(): boolean {
    return this.client !== undefined && this.clientOnline;
  }

  /**
   * Connect to cloud Cargoplane with given credentials.
   *
   * @param credential as received by calling a CargoplaneCloud#createCredentials()
   * @param emitEventMsBeforeExpiration how many milliseconds before credential#expiration
   *          shall the return observable emit an Event of type "expiring"?
   * @return observable of events about the connection. See documentation for details.
   */
  connect(
    credential: CargoplaneCredential,
    emitEventMsBeforeExpiration = MillisecondsInMinute,
  ): Observable<Event> {
    this.cleanupConnection();

    if (!credential.iotEndpoint) {
      console.error("No IoT endpoint defined. Cargoplane disabled");
      const error = new Subject<Event>();
      error.next(new Event("error"));
      error.complete();
      return error;
    }

    this.connectionEvent$ = new Subject<Event>();
    this.setupClient(credential);

    // Set expiration clock
    const credentialExpirationTime =
      Date.parse(credential.expiration) || MillisecondsInMinute * 59;
    console.debug(
      "Cargoplane credential expires in",
      Math.round(
        (credentialExpirationTime - Date.now()) / MillisecondsInMinute,
      ),
      "minutes",
    );
    this.clock.set(
      credentialExpirationTime - emitEventMsBeforeExpiration,
      this.connectionEvent$,
    );

    return this.connectionEvent$.asObservable();
  }

  /**
   * Disconnect and clear all subscriptions. (Ex: upon user logout)
   */
  disconnect(): void {
    this.typeSubjects.forEach((subject) => subject.complete());
    this.typeSubjects.clear();
    this.publishQueue = [];
    this.cleanupConnection();
  }

  /**
   * Obtain an RxJs Observable of a topic.
   * The call will automatically subscribe to the topic if this is the first request to observe it.
   *
   * @param topic to observe messages from
   * @param qos Quality of Service to use in subscribing (default: AtLeastOne)
   * @returns Observable that will receive events when message are received on the type.
   */
  observe<T extends GenericPayload>(
    topic: string,
    qos = QoS.AtLeastOnce,
  ): Observable<T> {
    let subject = this.typeSubjects.get(topic);
    if (!subject) {
      subject = new Subject<GenericPayload>();
      this.typeSubjects.set(topic, subject);

      if (this.isOnline()) {
        console.debug("Cargoplane subscribe to", topic);
        this.client
          ?.subscribe({
            subscriptions: [{ qos, topicFilter: topic }],
          })
          .catch((subAck) => console.error(subAck));
      }
    }

    return subject as Observable<T>;
  }

  /**
   * Unsubscribe from a topic and complete the observable previously returned by `observe`.
   * @param topic to stop observing
   */
  unobserve(topic: string): void {
    const subject = this.typeSubjects.get(topic);
    if (subject && this.isOnline()) {
      console.debug("Cargoplane unsubscribe from", topic);
      subject.complete();
      this.typeSubjects.delete(topic);

      this.client
        ?.unsubscribe({ topicFilters: [topic] })
        .catch((subAck) => console.error(subAck));
    }
  }

  /**
   * Publish a message.
   *
   * @param topic type of message (topic)
   * @param message content, if any. It will be stringified to JSON.
   * @param qos Quality of Service to use (default: AtLeastOne)
   * @returns success upon publishing
   */
  publish(
    topic: string,
    message: unknown | undefined = undefined,
    qos = QoS.AtLeastOnce,
  ): void {
    this.publishQueue.push({ topic, message, qos });

    if (this.clientOnline) this.publishQueuedMessages();
  }

  /**
   * Upon re-connecting to the cloud, re-subscribe to topics under observation.
   */
  private resubscribeToAllTopics(): void {
    const topics = [...this.typeSubjects.keys()];

    console.debug("Cargoplane resubscribing to topics", topics.join(", "));
    this.client
      ?.subscribe({
        subscriptions: topics.map((topicFilter) => ({
          qos: mqtt5.QoS.AtLeastOnce,
          topicFilter,
        })),
      })
      .catch((subAck) => {
        console.error(subAck);
      });
  }

  /**
   * Publish queued messages.
   */
  private publishQueuedMessages(): void {
    if (this.isOnline()) {
      const queue = [...this.publishQueue];
      this.publishQueue.length = 0;

      for (const item of queue) {
        const messageStr = item.message ? JSON.stringify(item.message) : "";
        console.debug(
          "Cargoplane publishing to topic",
          item.topic,
          ": ",
          messageStr,
        );
        this.client
          ?.publish({
            topicName: item.topic,
            payload: messageStr,
            qos: item.qos,
          })
          .catch((pubAck) => {
            console.error(pubAck);
            this.publishQueue.push(item);
          });
      }
    }
  }

  /** Helper for connecting as an IoT Device */
  private setupClient(credential: CargoplaneCredential): void {
    console.debug(
      "Cargoplane connecting as IoT Device @",
      credential.iotEndpoint,
    );
    const config =
      iot.AwsIotMqtt5ClientConfigBuilder.newWebsocketMqttBuilderWithSigv4Auth(
        credential.iotEndpoint,
        {
          region: credential.region,
          credentialsProvider: new auth.StaticCredentialProvider({
            aws_region: credential.region,
            aws_access_id: credential.accessKey,
            aws_secret_key: credential.secretKey,
            aws_sts_token: credential.sessionToken,
          }),
        },
      ).build();
    this.client = new mqtt5.Mqtt5Client(config);

    this.client.on("attemptingConnect", () => {
      console.debug("Cargoplane attempting to connect");
    });

    this.client.on("connectionSuccess", () => {
      console.debug("Cargoplane connected");
      this.clientOnline = true;
      this.connectionEvent$ &&
        this.connectionEvent$.next(new Event("connected"));
      this.resubscribeToAllTopics();
      this.publishQueuedMessages();
    });

    this.client.on("connectionFailure", (eventData) => {
      console.debug(
        "Cargoplane connection attempt failed:",
        eventData.error.toString(),
      );
      this.clientOnline = false;
    });

    this.client.on("disconnection", (eventData) => {
      console.debug("Cargoplane disconnected:", eventData.error.toString());
      this.clientOnline = false;
      this.connectionEvent$ &&
        this.connectionEvent$.next(new Event("disconnected"));
    });

    this.client.on("messageReceived", ({ message }) => {
      try {
        const payload = this.payloadParser.parse(message.payload);
        console.debug(
          "Cargoplane received topic",
          message.topicName,
          "with content:",
          payload,
        );
        const subject = this.typeSubjects.get(message.topicName);
        if (subject) {
          subject.next(payload);
        }
      } catch (_ex) {
        console.warn(
          "Cargoplane received topic",
          message.topicName,
          "with unparsable content:",
          message,
        );
      }
    });

    this.client.on("error", (error) => {
      console.error("Cargoplane error: ", error);
      this.connectionEvent$ && this.connectionEvent$.next(new Event("error"));
    });

    this.client.start();
  }

  /** Helper for cleaning up connection-based content */
  private cleanupConnection(): void {
    this.clock.clear();
    this.connectionEvent$ && this.connectionEvent$.complete();
    this.connectionEvent$ = undefined;

    if (this.client) {
      const oldClient = this.client;
      oldClient.once("stopped", () => oldClient.close());
      this.client.stop();
      this.client = undefined;
    }

    this.clientOnline = false;
  }
}
