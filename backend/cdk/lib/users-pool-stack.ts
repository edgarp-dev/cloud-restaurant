import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";

type StackOutput = {
	userPool: cognito.UserPool;
};

export class UsersPoolStack extends cdk.NestedStack {
	private readonly env: string;

	private readonly userPool: cognito.UserPool;

	constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
		super(scope, id, props);

		this.env = this.node.tryGetContext("env");
	}

	public boostrap(): StackOutput {
		const userPool = this.createUserPool();
		const userPoolClient = this.crateUserPoolClient(userPool);
		this.createIdentityPool(userPool, userPoolClient);

		return { userPool };
	}

	private createUserPool(): cognito.UserPool {
		const userPool = new cognito.UserPool(this, "UserPool", {
			userPoolName: `cloud-restaurant-user-pool-${this.env}`,
			signInAliases: {
				email: true,
			},
			autoVerify: {
				email: true,
			},
			selfSignUpEnabled: true,
			passwordPolicy: {
				minLength: 8,
				requireLowercase: true,
				requireUppercase: true,
				requireDigits: true,
				requireSymbols: true,
			},
		});

		new cognito.UserPoolDomain(this, "UserPoolDomain", {
			userPool,
			cognitoDomain: {
				domainPrefix: `cloud-restaurant-user-pool-${this.env}`,
			},
		});

		return userPool;
	}

	private crateUserPoolClient(
		userPool: cognito.UserPool
	): cognito.UserPoolClient {
		return new cognito.UserPoolClient(this, "UserPoolClient", {
			userPool,
			generateSecret: false,
			authFlows: {
				userPassword: true,
				userSrp: true,
			},
		});
	}

	private createIdentityPool(
		userPool: cognito.UserPool,
		userPoolClient: cognito.UserPoolClient
	): void {
		const identityPool = new cognito.CfnIdentityPool(
			this,
			"IdentityPool",
			{
				identityPoolName: `cloud-restaurant-identity-pool-${this.env}`,
				allowUnauthenticatedIdentities: false,
				cognitoIdentityProviders: [
					{
						clientId: userPoolClient.userPoolClientId,
						providerName: userPool.userPoolProviderName,
					},
				],
			}
		);

		const authenticatedRole = new iam.Role(
			this,
			"CognitoDefaultAuthenticatedRole",
			{
				assumedBy: new iam.FederatedPrincipal(
					"cognito-identity.amazonaws.com",
					{
						StringEquals: {
							"cognito-identity.amazonaws.com:aud": identityPool.ref,
						},
						"ForAnyValue:StringLike": {
							"cognito-identity.amazonaws.com:amr": "authenticated",
						},
					},
					"sts:AssumeRoleWithWebIdentity"
				),
			}
		);
		// authenticatedRole.addToPolicy(
		// 	new iam.PolicyStatement({
		// 		actions: ["s3:ListBucket"],
		// 		resources: ["arn:aws:s3:::your-bucket-name"],
		// 	})
		// );
		new cognito.CfnIdentityPoolRoleAttachment(
			this,
			"IdentityPoolRoleAttachment",
			{
				identityPoolId: identityPool.ref,
				roles: {
					authenticated: authenticatedRole.roleArn,
				},
			}
		);
	}
}
