import * as AWS from 'aws-sdk';
import {Credentials} from 'aws-sdk/clients/sts';

const iot = new AWS.Iot();
const sts = new AWS.STS();

/**
 * Requests to create Cargoplane credentials for a client application instance.
 */
export interface CargoplaneCredentialRequest {
    /** AWS Region to use. If not given, AWS_REGION environment variable is used */
    region?: string,
    /** Base IAM role name for the credentials */
    roleName: string,
    /**
     * Optional prefix to use on client name to avoid conflict
     * with other applications in the AWS account
     */
    sessionNamePrefix?: string,
    /** Full topic names credentials are to grant publishing to */
    pubTopics: string[],
    /** Full topic names credentials are to grant subscription to */
    subTopics: string[]
}

/**
 * Approved credentials for use by a client instance.
 */
export interface CargoplaneCredential {
    iotEndpoint: string,
    region: string,
    accessKey: string,
    secretKey: string,
    sessionToken: string
}

/**
 * Cloud-side API for Cargoplane.
 */
export class CargoplaneCloud {

    private iotData?: AWS.IotData;

    /**
     * Create Credentials for a client.
     * (Create a Lambda, behind your authentication wall,
     * that uses this to return credentials to a client.)
     */
    async createCredentials(request: CargoplaneCredentialRequest): Promise<CargoplaneCredential> {
        // Gets the current region
        let awsRegion = request.region ? request.region : this.getDefaultRegion();

        // Get the endpoint address
        const iotEndpoint = await this.getIotEndpoint(awsRegion);

        // get the account id which will be used to assume a role
        const accountId = await this.getAccountId();

        // create the iot client policy
        const clientPolicy = this.createClientPolicy(request.pubTopics, request.subTopics, awsRegion, accountId);

        // get assume role returns temporary keys
        const roleCredentials = await this.getAssumeRoleCredentials(accountId, request.roleName, clientPolicy, request.sessionNamePrefix);

        return {
            iotEndpoint: iotEndpoint,
            region: awsRegion,
            accessKey: roleCredentials.AccessKeyId,
            secretKey: roleCredentials.SecretAccessKey,
            sessionToken: roleCredentials.SessionToken
        };
    };

    /**
     * Publish a message.
     *
     * @param topic type of message (topic)
     * @param message content, if any. It will be stringified to JSON.
     * @returns success upon publishing
     */
    async publish(topic: string, message?: any): Promise<void> {
        console.info("Cargoplane publish to:", topic);

        let iotData : AWS.IotData = await this.getIotData();
        return iotData.publish({
            topic: topic,
            payload: message ? JSON.stringify(message) : ''
        }).promise().then(() => undefined);
    }

    /**
     * Get the region from the environment variable AWS_REGION
     */
    private getDefaultRegion(): string {
        const awsRegion = process.env['AWS_REGION'];
        if (!awsRegion) {
            throw new Error("process.env.AWS_REGION is not defined")
        }

        return awsRegion;
    }

    /**
     * Return the IotEndpoint
     * @param region optional aws region
     */
    private async getIotEndpoint(region?: string): Promise<string> {
        // the AWS.Iot() class will be created based on the region.  If the region parameter doesn't exist, we will get from the default iot
        const regionIot = (!!region) ? new AWS.Iot({ region: region }) : iot;
        return regionIot.describeEndpoint({ endpointType: 'iot:Data-ATS' }).promise()
            .then(val => {
                if (!val || !val.endpointAddress) {
                    throw new Error('Unable to obtain IoT Endpoint');
                }

                return val.endpointAddress;
            });
    }

    /**
     * Gets the current account ID
     * @returns account ID
     */
    private async getAccountId(): Promise<string> {
        // get the account id which will be used to assume a role
        const accountIdentity = await sts.getCallerIdentity({}).promise();

        if (!accountIdentity || !accountIdentity.Account) {
            throw new Error("cannot get accountId")
        }

        return accountIdentity.Account;
    }

    /**
     * Creates the Client Policy
     * @param pubTopics array of Topics client may publish to
     * @param subTopics array of Topics client may subscribe to
     * @param awsRegion aws region
     * @param accountId account ID
     */
    private createClientPolicy(pubTopics: string[] | undefined,
                               subTopics: string[] | undefined,
                               awsRegion: string,
                               accountId: string) {
        let subscribeResources: string[] = [];
        let receiveResources: string[] = [];
        if (!!subTopics) {
            subscribeResources = subTopics.map(subTopic => `arn:aws:iot:${awsRegion}:${accountId}:topicfilter/${subTopic}`);
            receiveResources = subTopics.map(subTopic => `arn:aws:iot:${awsRegion}:${accountId}:topic/${subTopic}`);
        }

        let publishResources: string[] = [];
        if (!!pubTopics) {
            publishResources = pubTopics.map(pubTopic => `arn:aws:iot:${awsRegion}:${accountId}:topic/${pubTopic}*`);
        }

        return {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Action: ['iot:Connect'],
                    Resource: `arn:aws:iot:${awsRegion}:${accountId}:client/*`
                },
                {
                    Effect: 'Allow',
                    Action: ['iot:Subscribe'],
                    Resource: subscribeResources
                },
                {
                    Effect: 'Allow',
                    Action: ['iot:Receive'],
                    Resource: receiveResources
                },
                {
                    Effect: 'Allow',
                    Action: ['iot:Publish'],
                    Resource: publishResources
                }
            ]
        };
    }

    /**
     * Gets the assume role credentials
     * @param accountId
     * @param roleName
     * @param clientPolicy
     * @param sessionNamePrefix
     * @returns Credentials
     */
    private async getAssumeRoleCredentials(accountId: string, roleName: string,
                                           clientPolicy: any, sessionNamePrefix?: string)
        : Promise<Credentials> {

        let roleSessionName = ((!sessionNamePrefix) ? "" : sessionNamePrefix) + Math.random().toString(36).substr(1);

        const params = {
            RoleArn: `arn:aws:iam::${accountId}:role/${roleName}`,
            RoleSessionName: roleSessionName,
            Policy: JSON.stringify(clientPolicy)
        };

        console.info("Assuming role: ", JSON.stringify(params, null, 2));
        // assume role returns temporary keys
        const role = await sts.assumeRole(params).promise().then(role => role);

        if (!role.Credentials) {
            throw new Error('Unable to obtain IoT credentials');
        }

        return role.Credentials;
    }

    /**
     * returns the IotData object in the current region
     * @returns AWS.IotData
     */
    private async getIotData(): Promise<AWS.IotData> {
        if (!this.iotData) {
            const iotEndpoint = await this.getIotEndpoint();
            this.iotData = new AWS.IotData({
                region: this.getDefaultRegion(),
                endpoint: iotEndpoint
            });
        }
        return this.iotData;
    }
}
