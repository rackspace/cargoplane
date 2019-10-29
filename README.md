# Cargoplane - Serverless publish/subscribe for webapps and AWS

Cargoplane is a toolset to help you quickly _transport message cargo_ between webapp clients and a backend running in the AWS cloud.

__Full documentation is published [online](https://docs.onica.com/projects/cargoplane).__

Cargoplane is written in Typescript, but transpiled to Javascript. The Lambda code is compatible with Node.js 8 and 10.
The client code is ES5, and so will work in any remotely modern browser.

This project is developed and maintained by the [Onica](https://www.onica.com) Cloud Native Development Practice.

# make.sh

Use the make.sh script to build all of the projects in an order that resolves the dependencies between them.
```
$ ./make.sh clean   # delete all node_modules directories
$ ./make.sh build   # npm install, test, and build all packages
$ ./make.sh check   # check what packages need to be published
$ ./make.sh publish # npm publish packages with new version numbers (must have bump versions first and have permission)
$ ./make.sh all     # do clean, build, & publish
```
