# Cargoplane Client - Serverless publish/subscribe for webapps and AWS

This is the client library part of Cargoplane.

## Usage

`npm i @cargoplane/client aws-iot-device-sdk rxjs`

### connect 

Connects/reconnects to Cargoplane Cloud with the given credentials.

```
connect(credential: CargoplaneCredential): void
```

The `credential` must be retrieved from the companion Lambda in the cloud package.

The `expiration` field in `CargoplaneCredential` provides the expiration ISO date-time of the credentials.
You must obtain new credentials and reconnect prior to expiration in order to remain connected. Subscriptions
are automatically re-applied upon reconnect. The expiration period is normally one hour, but it is best to use
this value rather than assume one hour.

### disconnect 

Disconnect and clear all subscriptions. (Ex: upon user logout)

```
disconnect(): void 
```
### isOnline

Is the service currently connected to the cloud?
If network access is lost, it will automatically attempt to reconnect when network access is
restored provided that the credentials have not expired.

    isOnline(): boolean

### observe

Obtain an RxJs Observable of a topic.
This call will automatically subscribe to the topic if this is the first request to observe it.

```
observe(topic: string): Observable<any>
```

### publish 

Publish a message to a topic.

```
publish(topic: string, message?: any): void 
```
