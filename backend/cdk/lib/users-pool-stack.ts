import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import path from "path";

type StackOutput = {
	userPool: cognito.UserPool;
};

export class UsersPoolStack extends cdk.NestedStack {
	private readonly env: string;

	constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
		super(scope, id, props);

		this.env = this.node.tryGetContext("env");
	}

	public boostrap(): StackOutput {
		const userPool = this.createUserPool();
		this.createGroups(userPool);
		const userPoolClient = this.crateUserPoolClient(userPool);
		this.createIdentityPool(userPool, userPoolClient);

		return { userPool };
	}

	private createUserPool(): cognito.UserPool {
		const postConfirmationLambdaRole = new iam.Role(
			this,
			"PreSignupLambdaRole",
			{
				assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
				managedPolicies: [
					iam.ManagedPolicy.fromAwsManagedPolicyName(
						"service-role/AWSLambdaBasicExecutionRole"
					),
				],
			}
		);
		postConfirmationLambdaRole.addToPolicy(
			new iam.PolicyStatement({
				actions: ["cognito-idp:AdminAddUserToGroup"],
				resources: ["*"],
			})
		);

		const postConfirmationLambda = new lambda.Function(this, "PreSignupLambda", {
			functionName: `cloud-restaurant-presignup-${this.env}`,
			runtime: lambda.Runtime.NODEJS_20_X,
			handler: "index.handler",
			code: lambda.Code.fromAsset(
				path.join(__dirname, "..", "..", "post-confirmation-lambda"),
				{
					bundling: {
						image: lambda.Runtime.NODEJS_20_X.bundlingImage,
						command: [
							"bash",
							"-c",
							"npm install && npm run build && cp -r dist/* /asset-output/ && cp -r node_modules /asset-output/",
						],
					},
				}
			),
			environment: {
				REGION: process.env.CDK_DEFAULT_REGION!,
			},
			role: postConfirmationLambdaRole,
		});

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
			lambdaTriggers: {
				postConfirmation: postConfirmationLambda,
			},
			customAttributes: {
				account_type: new cognito.StringAttribute({ mutable: true }),
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

	private createGroups(userPool: cognito.UserPool): void {
		const groups = ["customers", "restaurants", "delivery"];

		groups.forEach((group) => {
			new cognito.CfnUserPoolGroup(
				this,
				`${group.charAt(0).toUpperCase() + group.slice(1)}Group`,
				{
					groupName: group,
					userPoolId: userPool.userPoolId,
				}
			);
		});
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
		const identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
			identityPoolName: `cloud-restaurant-identity-pool-${this.env}`,
			allowUnauthenticatedIdentities: false,
			cognitoIdentityProviders: [
				{
					clientId: userPoolClient.userPoolClientId,
					providerName: userPool.userPoolProviderName,
				},
			],
		});

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
