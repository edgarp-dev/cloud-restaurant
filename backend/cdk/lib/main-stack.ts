import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class MainStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const env = this.node.tryGetContext("env");

		const userPool = new cognito.UserPool(this, "CloudRestaurantUserPool", {
			userPoolName: `${env}-cloud-restaurant-user-pool`,
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

		const userPoolClient = new cognito.UserPoolClient(
			this,
			"CloudRestaurantUserPoolClient",
			{
				userPool,
				generateSecret: false,
				authFlows: {
					userPassword: true,
					userSrp: true
				},
			}
		);

		const userPoolDomain = new cognito.UserPoolDomain(this, "UserPoolDomain", {
			userPool,
			cognitoDomain: {
				domainPrefix: `${env}-cloud-restaurant-user-pool`,
			},
		});

		const identityPool = new cognito.CfnIdentityPool(
			this,
			"CloudRestaurantIdentityPool",
			{
				identityPoolName: `${env}-cloud-restaurant-identity-pool`,
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

		const helloWorldLambda = new lambda.Function(
			this,
			"CloudRestaurantLambdaApi",
			{
				runtime: lambda.Runtime.NODEJS_20_X,
				handler: "index.handler",
				code: lambda.Code.fromInline(`
        exports.handler = async function(event) {
          return {
            statusCode: 200,
            body: JSON.stringify({ message: "Hello, World!" })
          };
        };
      `),
			}
		);

		const api = new apigateway.RestApi(this, "CloudRestaurantRestApi", {
			restApiName: `${env}-cloud-restaurant-rest-api`,
			deployOptions: {
				stageName: env,
			},
		});

		const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
			this,
			"CognitoAuthorizer",
			{
				cognitoUserPools: [userPool],
			}
		);

		const helloResource = api.root.addResource("hello");
		helloResource.addMethod(
			"GET",
			new apigateway.LambdaIntegration(helloWorldLambda),
			{
				authorizer,
				authorizationType: apigateway.AuthorizationType.COGNITO,
			}
		);

		// OUTPUTS
		new cdk.CfnOutput(this, "CognitoDomain", {
			value: `https://${userPoolDomain.domainName}.auth.${
				cdk.Stack.of(this).region
			}.amazoncognito.com`,
		});
		new cdk.CfnOutput(this, "UserPoolId", {
			value: userPool.userPoolId,
		});
		new cdk.CfnOutput(this, "IdentityPoolId", {
			value: identityPool.ref,
		});
		new cdk.CfnOutput(this, "ApiUrl", {
			value: api.url,
		});
	}
}
