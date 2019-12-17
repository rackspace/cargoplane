Client
======

Cargoplane consists of a *cloud* package and a *client* package, which must be used together in a solution.

This Cargoplane client package is used in your web application.

Install
-------

``npm i @cargoplane/client aws-iot-device-sdk rxjs``

Install with Angular
^^^^^^^^^^^^^^^^^^^^

If integrating with Angular, some changes are needed to make the aws-iot package, which is intended for a Node.js
environment, to work in a browser.

``npm i @angular-builders/custom-webpack --save-dev``

Add the file ``./webpack-custom.config.ts`` to the project's root folder with the following::

  module.exports = {
    node: {
      fs: 'empty',
      tls: 'empty',
      path: 'empty'
    }
  };

See also `AWS Javascript SDK with Angular <https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/#With_Angular>`_
for other possible changes that may be needed.

CargoplaneClient class
----------------------

The ``CargeplaneClient`` client is your API to integrate with Cargoplane.
It must be used as a singleton. (If you have dependency injection, use that.)

Please see the :doc:`demos <demo>` for examples to follow.

connect
^^^^^^^

Connects/reconnects to Cargoplane Cloud with the given credentials.

``connect(credential: CargoplaneCredential): void``

The ``credential`` must be retrieved from the companion Lambda in the cloud package calling
``CargoplaneCloud#createCredentials``.

The ``expiration`` field in ``CargoplaneCredential`` provides the expiration ISO date-time of the credentials.
You must obtain new credentials and reconnect prior to expiration in order to remain connected. Subscriptions
are automatically re-applied upon reconnect. The expiration period is normally one hour, but it is best to use
this value rather than assume one hour.

disconnect
^^^^^^^^^^

Disconnect and clear all subscriptions. (Ex: upon user logout)

``disconnect(): void``

isOnline
^^^^^^^^

Is the service currently connected to the cloud?

If network access is lost, it will automatically attempt to reconnect when network access is
restored provided that the credentials have not expired.

``isOnline(): boolean``

observe
^^^^^^^

Obtain an RxJs Observable of a topic.

This call will automatically subscribe to the topic if this is the first request to observe it.

``observe(topic: string): Observable<any>``

publish
^^^^^^^

Publish a message to a topic.

``publish(topic: string, message?: any): void``
