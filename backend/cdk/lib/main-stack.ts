import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as sfnTasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import path from "path";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

export class MainStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const env = this.node.tryGetContext("env");

		const userPool = new cognito.UserPool(this, "CloudRestaurantUserPool", {
			userPoolName: `cloud-restaurant-user-pool-${env}`,
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
					userSrp: true,
				},
			}
		);

		const userPoolDomain = new cognito.UserPoolDomain(this, "UserPoolDomain", {
			userPool,
			cognitoDomain: {
				domainPrefix: `cloud-restaurant-user-pool-${env}`,
			},
		});

		const identityPool = new cognito.CfnIdentityPool(
			this,
			"CloudRestaurantIdentityPool",
			{
				identityPoolName: `cloud-restaurant-identity-pool-${env}`,
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

		const api = new apigateway.RestApi(this, "CloudRestaurantRestApi", {
			restApiName: `cloud-restaurant-rest-api-${env}`,
			defaultCorsPreflightOptions: {
				allowOrigins: apigateway.Cors.ALL_ORIGINS,
				allowMethods: apigateway.Cors.ALL_METHODS,
				allowHeaders: ["Authorization", "Content-Type"],
			},
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

		const menuTable = new dynamodb.Table(this, "CloudRestaurantMenu", {
			tableName: `cloud-restaurant-menu-db-${env}`,
			partitionKey: { name: "Id", type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
		});

		const ordersTable = new dynamodb.Table(this, "CloudRestaurantOrdersTable", {
			tableName: `cloud-restaurant-orders-${env}`,
			partitionKey: { name: "orderId", type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
		});

		const ordersQueue = new sqs.Queue(this, "CloudRestaurantOrdersQueue", {
			queueName: `cloud-restaurant-orders-queue-${env}`,
		});

		const processOrderStep = new sfnTasks.DynamoPutItem(
			this,
			"Process Order Step",
			{
				table: ordersTable,
				item: {
					orderId: sfnTasks.DynamoAttributeValue.fromString(
						sfn.JsonPath.stringAt("$.orderId")
					),
					menuId: sfnTasks.DynamoAttributeValue.fromString(
						sfn.JsonPath.stringAt("$.menuId")
					),
					userId: sfnTasks.DynamoAttributeValue.fromString(
						sfn.JsonPath.stringAt("$.userId")
					),
					quantity: sfnTasks.DynamoAttributeValue.fromString(
						sfn.JsonPath.stringAt("$.quantity")
					),
					orderDate: sfnTasks.DynamoAttributeValue.fromString(
						sfn.JsonPath.stringAt("$.orderDate")
					),
				},
			}
		);

		const definition = processOrderStep;

		const processOrderStepFunction = new sfn.StateMachine(
			this,
			"ProcessOrderStepFunction",
			{
				definition,
				timeout: cdk.Duration.minutes(5),
			}
		);

		const triggerStepFunctionLambda = new lambda.Function(
			this,
			"TriggerStepFunctionLambda",
			{
				functionName: `cloud-restaurant-step-function-trigger-${env}`,
				runtime: lambda.Runtime.NODEJS_20_X,
				handler: "src/index.handler",
				code: lambda.Code.fromAsset(
					path.join(__dirname, "..", "..", "step-function-trigger-lambda"),
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
					STATE_MACHINE_ARN: processOrderStepFunction.stateMachineArn,
				},
			}
		);

		processOrderStepFunction.grantStartExecution(triggerStepFunctionLambda);

		triggerStepFunctionLambda.addEventSource(
			new SqsEventSource(ordersQueue, {
				batchSize: 1,
			})
		);

		ordersQueue.grantConsumeMessages(triggerStepFunctionLambda);

		const apiLambda = new lambda.Function(this, "CloudRestaurantApiLambda", {
			functionName: `cloud-restaurant-api-${env}`,
			runtime: lambda.Runtime.NODEJS_20_X,
			handler: "src/index.handler",
			code: lambda.Code.fromAsset(path.join(__dirname, "..", "..", "api"), {
				bundling: {
					image: lambda.Runtime.NODEJS_20_X.bundlingImage,
					command: [
						"bash",
						"-c",
						"npm install && npm run build && cp -r dist/* /asset-output/ && cp -r node_modules /asset-output/",
					],
				},
			}),
			environment: {
				MENU_TABLE: menuTable.tableName,
				ORDERS_QUEUE_URL: ordersQueue.queueUrl,
			},
		});

		menuTable.grantReadData(apiLambda);
		ordersQueue.grantSendMessages(apiLambda);

		const helloResource = api.root.addResource("hello");
		helloResource.addMethod(
			"GET",
			new apigateway.LambdaIntegration(apiLambda),
			{
				authorizer,
				authorizationType: apigateway.AuthorizationType.COGNITO,
			}
		);

		const menuResource = api.root.addResource("menu");
		menuResource.addMethod("GET", new apigateway.LambdaIntegration(apiLambda), {
			authorizer,
			authorizationType: apigateway.AuthorizationType.COGNITO,
		});

		const ordersResource = api.root
			.addResource("orders")
			.addResource("{menuId}");

		ordersResource.addMethod(
			"POST",
			new apigateway.LambdaIntegration(apiLambda),
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
