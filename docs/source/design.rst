Architecture and Design
=======================

Communication Flows
^^^^^^^^^^^^^^^^^^^

1. **Client to Client:** Web app clients can subscribe and publish to the same topics, allowing direct communications between them.
2. **Cloud to Client:** Your cloud code (ex: Lambdas) can easily publish to topics subscribed to by clients.
3. **Client to Cloud?** Generally, existing mechanisms such as API Gateway are better for this. However, it is possible to subscribe Lambdas to topics.
4. **Cloud to Cloud?** Only use Cargoplane this way if the cloud subscriber is in addition to web clients. For pure cloud to cloud, there are better options available within AWS such as SNS.

Design
^^^^^^

.. image:: sequence-diagram.png

In order to achieve the subscribe, publish, and receive capabilities there are two modules:

- cloud: Lambda to give the correct credentials.
- client: Browser client to send and receive messages.

Here are the steps:

1. Call AWS Lambda to get AWS IoT credentials and endpoint
2. Make MQTT Connection to AWS IoT with credentials

From there, you can:

1. Subscribe to topics and receive messages
2. Publish messages to topics
