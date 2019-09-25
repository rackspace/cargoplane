# Cargoplane - Cloud

This is the Cargoplane cloud package for the AWS Lambda.  

## Install

`npm i @cargoplane/cloud`

## Usage

### Infrastructure

Cargoplane is powered by AWS IoT Core. The first time credentials are created in a region for your AWS account,
the IoT endpoint is created and registered in DNS. This can take a few minute to create and still longer to DNS propagate.
Rather than having your application fail on the first attempt, you can pre-create the endpoint:

1. Login to AWS Console
2. Ensure you are in the desired region
3. Navigate to the "IoT Core" Service
4. Click "Get Started" button. (If you see one.)
5. Click on "Settings" in the left nav-pane, and check on the status of your "Custom endpoint".

The cloud-side of Cargoplane can be used to publish messages, but it's primary purpose is
to provide credentials for a client app. 
To do this, you must create an IAM role and a Lambda via API Gateway that uses this 
role to build credentials.

#### IAM Role

A role is needed to serve as the starting point for creating credentials for clients. The credentials created
from this role will give clients limited access to connect, subscribe, publish and receive messages via AWS IoT.
The actual credentials created for a client will be further limited by account, region, and topic.

    IoTRole:
      Type: 'AWS::IAM::Role'
      Properties:
        RoleName: mycargoplaneapp-role-dev
        AssumeRolePolicyDocument:
          Version: 2012-10-17
          Statement:
            - Effect: Allow
              Principal:
                AWS: !Join 
                  - ':'
                  - - 'arn:aws:iam'
                    - ''
                    - !Ref 'AWS::AccountId'
                    - root
              Action: 'sts:AssumeRole'
        Policies:
          - PolicyName: mycargoplaneapp-role-dev-policy
            PolicyDocument:
              Version: 2012-10-17
              Statement:
                Effect: Allow
                Action:
                  - 'iot:Connect'
                  - 'iot:Subscribe'
                  - 'iot:Publish'
                  - 'iot:Receive'
                Resource: 'arn:aws:iot:us-east-1:*:*'

You should of course replace the `RoleName` and `PolicyName` with appropriate names, best parameterized.
Also, the final resource region needs to be changed if not `us-east-1` or to be parameterized.

Example: [Cloud Demo Serverless Framework template](../demo/cloud/serverless.yml)

#### Lambda

Example: [Cloud Demo Lambda handler](../demo/cloud/src/handlers.ts)

The Lambda needs the following additional policies in order to create client credentials, and to
publish to topics:

    - Effect: "Allow"
      Action:
        - iot:DescribeEndpoint
        - iot:Connect
        - iot:Publish
      Resource: "*"
    - Effect: "Allow"
      Action:
        - 'sts:AssumeRole'
      Resource:
        Fn::GetAtt:
          - IoTRole
          - Arn


### CargoplaneCloud class

Coding is managed by the class CargoplaneCloud. Simply create a new instance like so:

    import {CargoplaneCloud, CargoplaneCredentialRequest} from '@cargoplane/cloud';
    const cargoplane = new CargoplaneCloud();

Then use one of the public methods to either create credentials for a client app,
or to publish a message.

#### createCredentials

    async createCredentials(request: CargoplaneCredentialRequest): Promise<CargoplaneCredential>

Example Usage:

    let credRequest: CargoplaneCredentialRequest = {
        roleName: "mycargoplaneapp-role-dev",
        pubTopics: [
            "chattopic/general"
        ],
        subTopics: [
            "chattopic/*"
        ]
    }

    let credentials = await new CargoplaneCloud().createCredentials(credRequest);


#### publish

    async publish(topic: string, message?: any): Promise<void> 

Example Usage:

    await cargoplane.publish(topic, message);

