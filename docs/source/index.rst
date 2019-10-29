.. image:: cargoplane-transparent-256.png
   :height: 101
   :width: 256
   :align: right

Cargoplane - Serverless publish/subscribe for webapps and AWS
=============================================================

What is this?
^^^^^^^^^^^^^

Cargoplane is a toolset to help you quickly *transport message cargo* between webapp clients and a
backend running in the AWS cloud.

Unlike other solutions, this one does not rely on a 3rd party (just you and AWS) and is entirely serverless.
Also unlike some alternatives, you application controls what topics each client has access to subscribe to
and which topics they may publish to.

Cargoplane is written in Typescript, but transpiled to Javascript. The Lambda code is compatible with Node.js 8 and 10.
The client code is ES5, and so will work in any remotely modern browser.

This repository is developed and maintained by the `Onica <https://www.onica.com>`_ Cloud Native Development Practice.

This collection is part of `Onica's <https://www.onica.com>`_
commitment to give back to the open source community.
Find this and other Onica open source repositories on `GitHub <https://github.com/onicagroup>`_.

Example Uses
^^^^^^^^^^^^

Chat
  The classic example for this is a chat ability between web site visitors and company support.
  In fact, a simple version of this serves as the `demo <demo>`_.

Push notifications
  Web app users can be notified of events that have occurred in the cloud.

Data Refresh
  The classic problem with web apps is knowing when the data showing in the browser is outdated.
  Cargoplane was originally built to solve this problem.
  When data is changed by one user, a message can be published (by that client or by a Lambda processing the change)
  to subscribing clients that a change has happened.
  The other clients then know to refresh their content from the cloud.
  (Only small data changes should be sent directly through Cargoplane.)

Content
^^^^^^^

* :doc:`Architecture and Design <design>`
* :doc:`Cloud Usage <cloud>`
* :doc:`Client Usage <client>`
* :doc:`Demos <demo>`
* :doc:`License <license>`

.. toctree::
   :maxdepth: 2
   :hidden:

   design
   cloud
   client
   demo
   license

Why Cargoplane?
^^^^^^^^^^^^^^^

Onica's early OSS releases have had aviation themed names;
this may or may not have something to do with the CTO being a pilot. Nobody really knows.

.. image:: cargoplane-transparent-256.png
   :height: 50
   :width: 128
   :align: right

Cargoplane is visualized as a means to transport (fly) cargo (information) from one point to another.
There isn't much more to it than that.

Also, the name was available. That was a big factor.
