import {Observable, Subject} from "rxjs";
import * as awsIot from 'aws-iot-device-sdk';

/**
 * Approved credentials for use by this client instance.
 */
export interface CargoplaneCredential {
    iotEndpoint: string,
    region: string,
    accessKey: string,
    secretKey: string,
    sessionToken: string
}

/** Message queued for publishing */
interface QueuedMessage {
    topic: string,
    message?: any
}

/**
 * Web browser-side API for Cargoplane.
 * Must use as a singleton.
 */
export class CargoplaneClient {

    /** Map of message type to RxJs subjects */
    private readonly typeSubjects = new Map<string, Subject<any>>();

    private client?: any;
    private clientOnline = false;
    private publishQueue: QueuedMessage[] = [];

    /**
     * Is the service currently connected to the cloud?
     */
    isOnline(): boolean {
        return this.clientOnline;
    }

    /**
     * Connect to cloud Cargoplane with given flight credentials.
     */
    connect(credential: CargoplaneCredential): void {
        console.debug("Cargoplane connecting");
        if (this.client) {
            this.client.end();
        }

        if (!credential.iotEndpoint) {
            console.error("No IoT endpoint defined. Cargoplane disabled");
            return;
        }

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
        console.debug("Cargoplane IoT Device ", params);
        this.client = awsIot.device(params);

        this.client.on('connect', () => {
            console.debug("Cargoplane connected");
            this.clientOnline = true;
            this.resubscribeToAllTopics();
            this.publishQueuedMessages();
        });

        this.client.on('message', (topic: string, message: any) => {
            console.debug("Cargoplane received topic", topic, "with content:", message);
            const subject = this.typeSubjects.get(topic);
            if (subject) {
                subject.next(message && message.length ? JSON.parse(message) : '');
            }
        });

        this.client.on('error', (err) => {
            console.error("Cargoplane error: ", err);
        });

        this.client.on('reconnect', () => {
            console.info("Cargoplane attempting reconnect");
        });

        this.client.on('offline', () => {
            console.debug("Cargoplane offline");
            this.clientOnline = false;
        });

        this.client.on('close', () => {
            console.debug("Cargoplane closed");
            this.clientOnline = false;
        });
    }

    /**
     * Disconnect all subscriptions (upon user logout)
     */
    disconnect(): void {
        this.typeSubjects.forEach(subject => {
            subject.complete();
        });
        this.typeSubjects.clear();

        if (this.client) {
            this.client.end();
            this.client = undefined;
        }
    }

    /**
     * Obtain an RxJs Observable of a topic.
     * The function will automatically subscribe to the IoT topic if this is the first request to observe it.
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
}
