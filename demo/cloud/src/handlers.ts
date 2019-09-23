import {CargoplaneCloud, CargoplaneCredentialRequest} from '@cargoplane/cloud';

const carogplane = new CargoplaneCloud();
const PUB_SUB_ROLE_NAME = process.env.PUB_SUB_ROLE_NAME;

export const getCredentials = async () => {
    if (!PUB_SUB_ROLE_NAME) {
        throw new Error("PUB_SUB_ROLE_NAME doesn't exist");
    }

    let credConfig: CargoplaneCredentialRequest = {
        roleName: PUB_SUB_ROLE_NAME,
        pubTopics: [
            "chattopic/mqtt"
        ],
        subTopics: [
            "chattopic/*"
        ]
    };

    let responseBody = await carogplane.createCredentials(credConfig);

    // Wow, this is annoying. Have you tried @sailplane/lambda-utils? ;-)
    let response = {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(responseBody)
    };

    console.log("response: " + JSON.stringify(response));
    return response;
};

export const publish = async (event) => {
    if (!PUB_SUB_ROLE_NAME) {
        throw new Error("PUB_SUB_ROLE_NAME doesn't exist");
    }

    let body = JSON.parse(event["body"]);

    let topic = body.topic;
    let message = {
        text: body.text
    };

    await carogplane.publish(topic, message);

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*"
        },
        body: ''
    };
};
