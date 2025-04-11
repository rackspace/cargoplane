# Client

Cargoplane consists of a *cloud* package and a *client* package, which must be used together in a solution.

This Cargoplane client package is used in your web application.

## Install

```shell
npm i @cargoplane/client aws-iot-device-sdk-v2 rxjs url util
```

The last two packages are implementation of these Node.js libraries that bring these APIs
to your browser. They are needed because `aws-iot-device-sdk-v2` is designed to run in Node.js.

## CargoplaneClient class

The `CargeplaneClient` client is your API to integrate with Cargoplane.
It must be used as a singleton. (If you have dependency injection, use that.)

Please see the [demos](demo.md) for examples to follow.

### connect

Connects or reconnects to Cargoplane Cloud with the given credentials.

`connect(credential: CargoplaneCredential, emitEventMsBeforeExpiration?: number): Observable<Event>`

The `credential` must be retrieved from the [companion Lambda in the cloud package](cloud.md) calling
`CargoplaneCloud#createCredentials`.

`connect` will return a stream of [Events](https://developer.mozilla.org/en-US/docs/Web/Events)
about the connection. Check the Event `type` field for what happened.
Unless otherwise stated, Cargoplane will log these events and manage them automatically.

* `type === "connected"`: Connection has completed.
* `type === "disconnected"`: Connection has been dropped.
* `type === "expiring"`: The current credentials are expiring (or has already).
  * Use this to trigger your application to obtain new credentials to call ``connect`` with again.
  * Subscriptions are automatically re-applied upon reconnect.
  * You can control how early the expiration warning comes by optionally passing in a value
    for ``emitEventMsBeforeExpiration``. The default is one minute.
* `type === "clock-resume"`
  * If the computer sleeps or the browser tab is suspended, this will be emitted when processing resumes.
  * *Messages may have been lost while suspended* - you may need to take action to account for this.
  * If the credentials expired during the suspension, a separate `expiring` event will follow this.
* `type === "error"`: There was an error with the connection. (Cargoplane will try to reconnect if needed.)

### disconnect

Disconnect and clear all subscriptions. (Ex: Upon user logout)

`disconnect(): void`

### isOnline

Is the service currently connected to the cloud?

If network access is lost, it will automatically attempt to reconnect when network access is
restored provided that the credentials have not expired.

`isOnline(): boolean`

### observe

Obtain an RxJs Observable of a topic.

This call will automatically subscribe to the topic if this is the first request to observe it.

`observe(topic: string, qos?: QoS): Observable<any>`

The `qos` option lets you choose the Quality of Service on the subscription attempt. 
The default is `QoS.AtLeastOnce`. You may also choose `QoS.AtMostOnce`, which involves less
overhead but should only be used on the most reliable of network connections.

### unobserve

Complete all RxJs Observables of a topic and unsubscribe to the topic.

`unobserve(topic: string): void`

### publish

Publish a message to a topic.

`publish(topic: string, message?: unknown | undefined, qos?: QoS): void`

The `qos` option lets you choose the Quality of Service on the publishing attempt.
The default is `QoS.AtLeastOnce`. You may also choose `QoS.AtMostOnce`, which involves less
overhead but should only be used on the most reliable of network connections.
