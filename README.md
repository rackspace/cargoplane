<img style="float: right" src="./docs/cargoplane-transparent-256.png" alt="Cargoplane logo" />

# Cargoplane - Serverless publish/subscribe for webapps and AWS

## What is this?

Cargoplane is a toolset to help you quickly and **easily** *transport message* "cargo" between webapp clients and a
backend running in the AWS cloud.

### Example Use Cases

- Cloud to webapp broadcast notifications of changes
- Cloud Asynchronous operation results to individuals or groups of users
- Client-to-client chat or notifications - to targeting individuals, groups, or everyone.
- Extend a cloud event-driven architecture to webapps.

#### Data Refresh

The classic problem with web apps is knowing when the data showing in the browser is outdated.
Cargoplane was originally built to solve this problem.
When data is changed by one user, a message can be published
(by that client or by a cloud compute processing the change)
to subscribing clients that a change has happened.
The other clients then know to refresh their content from the cloud.

## How does it work?

Cargoplane leverages [AWS IoT Core's](https://aws.amazon.com/iot-core/) [message broker feature](https://docs.aws.amazon.com/iot/latest/developerguide/topics.html).
This is the same ability that millions of IoT devices use, but in your web app!

Cargoplane is two small libraries, one as an API in AWS Cloud (running in Lambda or any compute container or server),
and one to use in your webapp. Demo code is provided in both React and Angular.

All code is written in Typescript, but transpiled to Javascript in both CommonJS and ESM.
The cloud-side code is compatible with Node.js 20 and above.
The client webapp code targets ES2020, and so will work with all current browsers.

## Pros and Cons

**Benefits** over other solutions:

- Does not rely on a 3rd party product, just you and AWS.
- Entirely serverless.
- No need to manually track clients, subscriptions, unsubscribes, connects, and disconnects in a database, unlike [API Gateway websockets](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html).
- Simple to use, unlike [AWS AppSync GraphQL](https://docs.aws.amazon.com/appsync/latest/devguide/real-time-websocket-client.html). 
- Inexpensive - based on [AWS IoT Core](https://aws.amazon.com/iot-core/pricing/).
- Strict user authorization via specific permission to publish and/or subscribe to topic hierarchies.
- Messages can be global broadcast topics or individually targeted.
- Client-to-client communication is possible, with no server-side coding just proper topic authorization.
- Libraries provide easy publishing from client or cloud, and subscription in clients.

**Limits**:

- Authorization policy is limited to tens of topic hierarchies (exact or wildcarded prefixes) per user.
  - This is due to a limit of 2048 characters for the AWS IAM policy enforcing authorization on both subscriptions and publishing; thus the exact limit depends on the topic names. 
- While *cloud*-side subscriptions are possible via normal AWS IoT Core means, Cargoplane does not simplify this for you.
- Message ("cargo") payloads have a maximum size of 128 KB of text.

## About Us

This repository is developed and maintained by the [Rackspace Technology](https://www.rackspace.com>)
This collection is part of Rackspace's commitment to give back to the open source community.
Find this and other Rackspace Technology open source repositories on [GitHub](https://github.com/rackspace).


## Content

* [Architecture and Design](./docs/design.md)
* [Cloud Usage](./docs/cloud.md)
* [Client Usage](./docs/client.md)
* [Demos](./docs/demo.md)
* [License](LICENSE)

## Why "Cargoplane"?

This library originally was developed by the Cloud Native Development practice at an AWS consultancy
called Onica. (Onica become part of Rackspace Technology in 2020.)

Onica's early OSS releases have had aviation themed names;
this may or may not have something to do with the CTO being a pilot. Nobody really knows. 😉

Cargoplane is visualized as a means to transport (fly) cargo (information) from one point to another.
There isn't much more to it than that.

Also, the name was available in NPM. That was a big factor.

![](./docs/cargoplane-sunset.png)
