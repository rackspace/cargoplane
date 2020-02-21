import {Observable, Subject} from "rxjs";
import * as awsIot from 'aws-iot-device-sdk';

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

/** Message queued for publishing */
interface QueuedMessage {
    topic: string;
    message?: any;
}

const MillisecondsInMinute = 60000;

/**
 * Specialized version of setTimer():
 * - Emits events
 * - Checks actual wall time, not just clock ticks
 * - Detects discrepancy which indicates the CPU had been suspended.
 */
class ClockTimer {
    private timer?: NodeJS.Timer;
    private event$?: Subject<Event>;
    private expiringTime: number;
    private lastMinuteTime: number;

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
        this.timer && clearTimeout(this.timer);
        this.timer = undefined;
        this.event$ = undefined;
    }

    private checkClock() {
        const now = Date.now();
        if ((now - this.lastMinuteTime) > (2*MillisecondsInMinute)) {
            this.event$ && this.event$.next(new Event('clock-resume'));
        }
        if (now >= this.expiringTime) {
            this.event$ && this.event$.next(new Event('expiring'));
        }
        this.lastMinuteTime = now;
    }
}

/**
 * Web browser-side API for Cargoplane.
 * Must use as a singleton.
 *
 * Credentials must be obtained via CargoplaneCloud#createCredentials() via code running
 * in AWS. Note that the credentials include an expiration date-time.
 * You must obtain new credentials and reconnect prior to expiration in order to remain
 * connected. Subscriptions are automatically re-applied upon reconnect. The expiration
 * period is normally one hour, but it is best to use this value rather than assume one
 * hour.
 */
export class CargoplaneClient {

    /** Map of message type to RxJs subjects */
    private readonly typeSubjects = new Map<string, Subject<any>>();

    private client?: any;
    private clientOnline = false;
    private publishQueue: QueuedMessage[] = [];
    private connectionEvent$?: Subject<Event>;
    private clock = new ClockTimer();

    /**
     * Is the service currently connected to the cloud?
     */
    isOnline(): boolean {
        return this.client && this.clientOnline;
    }

    /**
     * Connect to cloud Cargoplane with given credentials.
     *
     * @param credential as received by calling a CargoplaneCloud#createCredentials()
     * @param emitEventMsBeforeExpiration how many milliseconds before credential#expiration
     *          shall the return observable emit an Event of type "expiring"?
     * @return observable of events about the connection. See documentation for details.
     */
    connect(credential: CargoplaneCredential,
            emitEventMsBeforeExpiration = MillisecondsInMinute,
    ): Observable<Event> {
        this.cleanupConnection();

        if (!credential.iotEndpoint) {
            console.error("No IoT endpoint defined. Cargoplane disabled");
            const error = new Subject<Event>();
            error.next(new Event('error'));
            error.complete();
            return error;
        }

        this.setupClient(credential);
        this.connectionEvent$ = new Subject<Event>();

        // Set expiration clock
        const credentialExpirationTime = Date.parse(credential.expiration) || MillisecondsInMinute * 59;
        console.debug('Cargoplane credential expires in',
                      Math.round((credentialExpirationTime - Date.now()) / MillisecondsInMinute),
                      'minutes');
        this.clock.set(credentialExpirationTime - emitEventMsBeforeExpiration, this.connectionEvent$);

        return this.connectionEvent$.asObservable();
    }

    /**
     * Disconnect and clear all subscriptions. (Ex: upon user logout)
     */
    disconnect(): void {
        this.typeSubjects.forEach(subject => subject.complete());
        this.typeSubjects.clear();
        this.publishQueue = [];
        this.cleanupConnection();
    }

    /**
     * Obtain an RxJs Observable of a topic.
     * The call will automatically subscribe to the topic if this is the first request to observe it.
     *
     * @param topic
     * @returns Observable that will receive events when message are received on the type.
     */
    observe<T>(topic: string): Observable<T> {
        let subject = this.typeSubjects.get(topic);
        if (!subject) {
            subject = new Subject<T>();
            this.typeSubjects.set(topic, subject);

            if (this.client && this.clientOnline) {
                console.debug("Cargoplane subscribe to", topic);
                this.client.subscribe(topic);
            }
        }

        return subject;
    }

    /**
     * Publish a message.
     *
     * @param topic type of message (topic)
     * @param message content, if any. It will be stringified to JSON.
     * @returns success upon publishing
     */
    publish(topic: string, message?: any): void {
        this.publishQueue.push({ topic, message });

        if (this.clientOnline)
            this.publishQueuedMessages();
    }

    /**
     * Upon (re)connecting to the cloud, (re)subscribe to topics under observation.
     */
    private resubscribeToAllTopics(): void {
        this.typeSubjects.forEach((subject, topic) => {
            console.debug('Cargoplane resubscribing to topic', topic);
            this.client.subscribe(topic);
        });
    }

    /**
     * Publish queued messages.
     */
    private publishQueuedMessages(): void {
        this.publishQueue.forEach(item => {
            const messageStr = item.message ? JSON.stringify(item.message) : '';
            console.debug('Cargoplane publishing to topic', item.topic, ': ', messageStr);
            this.client.publish(item.topic, messageStr);
        });

        this.publishQueue.length = 0;
    }

    /** Helper for connecting as an IoT Device */
    private setupClient(credential: CargoplaneCredential): void {
        const params = {
            region: credential.region,
            protocol: 'wss',
            accessKeyId: credential.accessKey,
            secretKey: credential.secretKey,
            sessionToken: credential.sessionToken,
            port: 443,
            host: credential.iotEndpoint,
            autoResubscribe: false
        };
        console.debug("Cargoplane connecting as IoT Device ", params);
        this.client = awsIot.device(params);

        this.client.on('connect', () => {
            console.debug("Cargoplane connected");
            this.clientOnline = true;
            this.connectionEvent$ && this.connectionEvent$.next(new Event('connected'));
            this.resubscribeToAllTopics();
            this.publishQueuedMessages();
        });

        this.client.on('message', (topic: string, message: any) => {
            try {
                const payload = message && message.length ? JSON.parse(message) : '';
                console.debug("Cargoplane received topic", topic, "with content:", payload);
                const subject = this.typeSubjects.get(topic);
                if (subject) {
                    subject.next(payload);
                }
            }
            catch (ex) {
                console.warn("Cargoplane received topic", topic, "with unparsable content:", message);
            }
        });

        this.client.on('error', (event: Event) => {
            console.error("Cargoplane error: ", event);
            this.connectionEvent$ && event && this.connectionEvent$.next(event);
        });

        this.client.on('reconnect', () => {
            console.info("Cargoplane attempting reconnect");
        });

        this.client.on('offline', () => {
            console.debug("Cargoplane offline");
            this.clientOnline = false;
            this.connectionEvent$ && this.connectionEvent$.next(new Event('offline'));
        });

        this.client.on('close', () => {
            console.debug("Cargoplane closed");
            this.clientOnline = false;
            this.connectionEvent$ && this.connectionEvent$.next(new Event('disconnected'));
        });
    }

    /** Helper for cleaning up connection-based content */
    private cleanupConnection(): void {
        this.clock.clear();
        this.connectionEvent$ && this.connectionEvent$.complete();
        this.connectionEvent$ = undefined;

        this.client && this.client.end();
        this.client = undefined;
        this.clientOnline = false;
    }
}
