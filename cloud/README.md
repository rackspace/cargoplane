# Cargoplane - Cloud

This is the Cargoplane cloud package for the AWS Lambda.  

## Install

`npm i @cargoplane/cloud`

Cargoplane is powered by AWS IoT Core. The first time credentials are created in a region for your AWS account,
the IoT endpoint is created and registered in DNS. This can take a few minute to create and still longer to DNS propagate.
Rather than having your application fail on the first attempt, you can pre-create the endpoint:

1. Login to AWS Console
2. Ensure you are in the desired region
3. Navigate to the "IoT Core" Service
4. Click "Get Started" button. (If you see one.)
5. Click on "Settings" in the left nav-pane, and check on the status of your "Custom endpoint".

## Usage

### createCredentials

`    async createCredentials(request: FlightCredentialRequest): Promise<FlightCredential>`

Example Usage:

    let credRequest: FlightCredentialRequest = {
        roleName: PUB_SUB_ROLE_NAME,
        pubTopics: [
            "chattopic/general"
        ],
        subTopics: [
            "chattopic/*"
        ]
    }

    let awsCredentials = await new CargoplaneCloud().createCredentials(credRequest);


### publish

```
async publish(topic: string, message?: any): Promise<void> 
```

Example Usage:

    await cargoplane.publish(topic, message);

