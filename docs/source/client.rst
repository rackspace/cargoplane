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

Similarly, if you use the default Karma unit test running, add the following in ``karma.conf.js`` as another property
passed to ``config.set``::

    webpack: {
      node: {
        fs: 'empty',
        tls: 'empty',
        path: 'empty'
      }
    }

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

``connect(credential: CargoplaneCredential, emitEventMsBeforeExpiration?: number): Observable<Event>``

The ``credential`` must be retrieved from the companion Lambda in the cloud package calling
``CargoplaneCloud#createCredentials``.

``connect`` will return a stream of `Events <https://developer.mozilla.org/en-US/docs/Web/Events>`_
about the connection. Check the Event ``type`` field for what happened.
Unless otherwise stated, Cargoplane will log these events and manage them automatically.

* ``type === 'connected'``: Connection has completed.
* ``type === 'disconnected'``: Connection has been dropped.
* ``type === 'expiring'``: The current credentials are expiring (or has already).
  Use this to trigger your application to obtain new credentials to call ``connect`` with again.
  Subscriptions are automatically re-applied upon reconnect.
  You can control how early the expiration warning comes by optionally passing in a value
  for ``emitEventMsBeforeExpiration``. The default is one minute.
* ``type === 'clock-resume'``: If the computer sleeps or the browser tab is suspended, this will be
  emitted when processing resumes. *Messages may have been lost while suspended* - you may need to
  take action to account for this. If the credentials expired during the suspension, a separate
  ``expiring`` event will follow this.
* ``type === 'error'``: There was an error with the connection. (Cargoplane will try to reconnect if needed.)


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

unobserve
^^^^^^^

Complete all RxJs Observables of a topic and unsubscribe to the topic.

``unobserve(topic: string): void``

publish
^^^^^^^

Publish a message to a topic.

``publish(topic: string, message?: any): void``
