# Cargoplane Client - Serverless publish/subscribe for webapps and AWS

This is the client library part of Cargoplane.

## Usage

`npm i @cargoplane/client aws-iot-device-sdk rxjs`

### connect 

Connects/reconnects to Cargoplane Cloud.

```
connect(credential: CargoplaneCredential): void
```

The `credential` must be retrieved from the companion Lambda in the cloud package.


### observe

Subscribes to a topic and create an observable.

```
observe(topic: string): Observable<any>
```

### publish 
```
publish(topic: string, message?: any): void 
```

### disconnect 

Disconnects disconnects to Cargoplane Cloud.

```
disconnect(): void 
```
