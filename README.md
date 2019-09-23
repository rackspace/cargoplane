# Cargoplane - serverless publish/subscribe for webapps and AWS

## What?

Cargoplane is a toolset to help you quickly _transport message cargo_ between webapp clients and a backend running in the AWS cloud.
It is written in Typescript, but usable wit Javascript as well. The Lambda code is compatible with Node.js 8 and 10.

This repository is developed and maintained by the [Onica](https://www.onica.com) Cloud Native Development Practice.

TODO: Much more documentation needed.
   
### Example

1. Chat/chat windows
2. Push notifications

## Design

![](./sequence-diagram.png)

In order to achieve the subscribe, publish, and recevie capabilities there are two modules:

* cloud: Lambda to give the correct credentials. 
* client: Browser client to send and receive messages.

Here are the steps:
1. Call AWS Lambda to get AWS IoT credentials and endpoint
1. Make MQTT Connection to AWS IoT with credentials 

From there, you can:
1. Subscribe to topics and receive messages
1. Publish messages to topics

### Demo

The `demo` directory contains a simple chat application to show how to use Cargoplane. It consists of:

1. A Serverless Framework based cloud stack.
1. An Angular webapp client.
1. A React webapp client.
