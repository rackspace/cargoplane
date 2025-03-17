import {
  DescribeEndpointCommand,
  DescribeEndpointCommandOutput,
  IoTClient,
} from "@aws-sdk/client-iot";
import {
  IoTDataPlaneClient,
  PublishCommand,
} from "@aws-sdk/client-iot-data-plane";
import {
  AssumeRoleCommand,
  Credentials,
  GetCallerIdentityCommand,
  STSClient,
} from "@aws-sdk/client-sts";

class CargoplaneError extends Error {
  readonly statusCode = 500 as const;
}

type AllDefined<T extends object> = Required<{
  [K in keyof T]: Exclude<T[K], undefined>;
}>;

/**
 * Requests to create Cargoplane credentials for a client application instance.
 */
export interface CargoplaneCredentialRequest {
  /** Base IAM role name for the credentials */
  roleName: string;
  /**
   * Optional prefix to use on client name to avoid conflict
   * with other applications in the AWS account
   */
  sessionNamePrefix?: string;
  /** Full topic names credentials are to grant publishing to */
  pubTopics: string[];
  /** Full topic names credentials are to grant subscription to */
  subTopics: string[];
}

/**
 * Approved credentials for use by a client instance.
 */
export interface CargoplaneCredential {
  iotEndpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  sessionToken: string;
  /** ISO-8601 date-time of when the credentials expire - normally one hour after issuing */
  expiration: string;
}

/**
 * Cloud-side API for Cargoplane.
 */
export class CargoplaneCloud {
  private readonly awsRegion: string;
  private iotData?: IoTDataPlaneClient;
  private iot?: IoTClient;
  private sts?: STSClient;

  /**
   * Construct a CargoplaneCloud instance for the given region
   * @param awsRegion AWS Region to use. If not given, AWS_REGION environment variable is used.
   */
  constructor(awsRegion?: string) {
    if (!awsRegion) {
      awsRegion = process.env["AWS_REGION"];
      if (!awsRegion) {
        throw new CargoplaneError(
          "AWS_REGION environment variable is not defined and none given in constructor",
        );
      }
    }
    this.awsRegion = awsRegion;
  }

  /**
   * Create Credentials for a client.
   * (Create a Lambda, behind your authentication wall,
   * that uses this to return credentials to a client.)
   */
  public async createCredentials(
    request: CargoplaneCredentialRequest,
  ): Promise<CargoplaneCredential> {
    // Get the endpoint address
    const iotEndpoint = await this.getIotEndpoint();

    // get the account id which will be used to assume a role
    const accountId = await this.getAccountId();

    // create the iot client policy
    const clientPolicy = this.createClientPolicy(
      request.pubTopics,
      request.subTopics,
      accountId,
    );

    // get assume role returns temporary keys
    const roleCredentials = await this.getAssumeRoleCredentials(
      accountId,
      request.roleName,
      clientPolicy,
      request.sessionNamePrefix,
    );

    return {
      iotEndpoint: iotEndpoint,
      region: this.awsRegion,
      accessKey: roleCredentials.AccessKeyId,
      secretKey: roleCredentials.SecretAccessKey,
      sessionToken: roleCredentials.SessionToken,
      expiration: roleCredentials.Expiration.toISOString(),
    };
  }

  /**
   * Publish a message.
   *
   * @param topic type of message (topic)
   * @param message content, if any. It will be stringified to JSON.
   * @returns success upon publishing
   */
  public async publish(topic: string, message?: unknown): Promise<void> {
    console.info("Cargoplane publish to:", topic);

    const iotDataClient = await this.getIotDataClient();
    return iotDataClient
      .send(
        new PublishCommand({
          topic: topic,
          payload: message ? JSON.stringify(message) : "",
        }),
      )
      .then(() => undefined);
  }

  /**
   * Return the IotEndpoint
   */
  private async getIotEndpoint(): Promise<string> {
    const iotClient = await this.getIotClient();
    return iotClient
      .send(new DescribeEndpointCommand({ endpointType: "iot:Data-ATS" }))
      .then((result: DescribeEndpointCommandOutput) => {
        if (!result || !result.endpointAddress) {
          throw new CargoplaneError("Unable to obtain IoT Endpoint");
        }
        return result.endpointAddress;
      });
  }

  /**
   * Gets the current account ID
   * @returns account ID
   */
  private async getAccountId(): Promise<string> {
    // get the account id which will be used to assume a role
    const stsClient = await this.getSTSClient();
    const response = await stsClient.send(new GetCallerIdentityCommand({}));

    if (!response || !response.Account) {
      throw new CargoplaneError(
        "Cannot caller's IAM identity to fetch AWS account ID",
      );
    }

    return response.Account;
  }

  /**
   * Creates the Client Policy
   * @param pubTopics array of Topics client may publish to
   * @param subTopics array of Topics client may subscribe to
   * @param accountId account ID
   * @returns AWS IAM Policy document
   */
  private createClientPolicy(
    pubTopics: string[],
    subTopics: string[],
    accountId: string,
  ): string {
    let subscribeResources: string[] = [];
    let receiveResources: string[] = [];
    if (subTopics?.length > 0) {
      subscribeResources = subTopics.map(
        (subTopic) =>
          `arn:aws:iot:${this.awsRegion}:${accountId}:topicfilter/${subTopic}`,
      );
      receiveResources = subTopics.map(
        (subTopic) =>
          `arn:aws:iot:${this.awsRegion}:${accountId}:topic/${subTopic}`,
      );
    }

    let publishResources: string[] = [];
    if (pubTopics?.length > 0) {
      publishResources = pubTopics.map(
        (pubTopic) =>
          `arn:aws:iot:${this.awsRegion}:${accountId}:topic/${pubTopic}*`,
      );
    }

    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["iot:Connect"],
          Resource: [`arn:aws:iot:${this.awsRegion}:${accountId}:client/*`],
        },
      ],
    };

    if (subscribeResources.length > 0) {
      policy.Statement.push({
        Effect: "Allow",
        Action: ["iot:Subscribe"],
        Resource: subscribeResources,
      });
    }

    if (receiveResources.length > 0) {
      policy.Statement.push({
        Effect: "Allow",
        Action: ["iot:Receive"],
        Resource: receiveResources,
      });
    }

    if (publishResources.length > 0) {
      policy.Statement.push({
        Effect: "Allow",
        Action: ["iot:Publish"],
        Resource: publishResources,
      });
    }

    return JSON.stringify(policy);
  }

  /**
   * Gets the assume role credentials
   */
  private async getAssumeRoleCredentials(
    accountId: string,
    roleName: string,
    clientPolicy: string,
    sessionNamePrefix?: string,
  ): Promise<AllDefined<Credentials>> {
    const roleSessionName =
      (!sessionNamePrefix ? "" : sessionNamePrefix) +
      Math.random().toString(36).substring(1);

    const params = {
      RoleArn: `arn:aws:iam::${accountId}:role/${roleName}`,
      RoleSessionName: roleSessionName,
      Policy: clientPolicy,
    };

    console.info("Assuming role: ", JSON.stringify(params, null, 2));
    const stsClient = await this.getSTSClient();
    const response = await stsClient.send(new AssumeRoleCommand(params));

    if (
      !response.Credentials?.AccessKeyId ||
      !response.Credentials?.SecretAccessKey ||
      !response.Credentials?.SessionToken ||
      !response.Credentials?.Expiration
    ) {
      throw new CargoplaneError("Unable to assume IoT credentials");
    }

    return response.Credentials as AllDefined<Credentials>;
  }

  /**
   * @returns the STSClient in the defined region
   */
  private async getSTSClient(): Promise<STSClient> {
    if (!this.sts) {
      this.sts = new STSClient({ region: this.awsRegion });
    }
    return this.sts;
  }

  /**
   * @returns the IoTClient in the defined region
   */
  private async getIotClient(): Promise<IoTClient> {
    if (!this.iot) {
      this.iot = new IoTClient({ region: this.awsRegion });
    }
    return this.iot;
  }

  /**
   * @returns the IoTDataPlaneClient in the defined region
   */
  private async getIotDataClient(): Promise<IoTDataPlaneClient> {
    if (!this.iotData) {
      const iotEndpoint = await this.getIotEndpoint();
      this.iotData = new IoTDataPlaneClient({
        region: this.awsRegion,
        endpoint: "https://" + iotEndpoint,
      });
    }
    return this.iotData;
  }
}
