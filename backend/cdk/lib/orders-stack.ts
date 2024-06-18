import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import path from "path";

type StackOutput = {
	ordersRestApi: apigateway.RestApi;
	ordersTable: dynamodb.Table;
	ordersQueue: sqs.Queue;
};

export class OrdersStack extends cdk.NestedStack {
	private readonly env: string;

	constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
		super(scope, id, props);

		this.env = this.node.tryGetContext("env");
	}

	public boostrap(userPool: cognito.UserPool): StackOutput {
		const menuTable = this.createMenuTable();
		const ordersQueue = this.createOrdersQueue();
		const ordersTable = this.createOrdersTable();
		const authorizer = this.createAuthorizer(userPool);
		const restApi = this.createRestApi();
		const restApiLambda = this.createRestApiLambda(menuTable, ordersQueue);
		this.createRestApiResources(restApi, restApiLambda, authorizer);

		return { ordersRestApi: restApi, ordersTable, ordersQueue };
	}

	private createMenuTable(): dynamodb.Table {
		return new dynamodb.Table(this, "MenuTable", {
			tableName: `cloud-restaurant-menu-db-${this.env}`,
			partitionKey: { name: "Id", type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
		});
	}

	private createOrdersQueue(): sqs.Queue {
		return new sqs.Queue(this, "OrdersQueue", {
			queueName: `cloud-restaurant-orders-queue-${this.env}`,
		});
	}

	private createOrdersTable(): dynamodb.Table {
		return new dynamodb.Table(this, "OrdersTable", {
			tableName: `cloud-restaurant-orders-${this.env}`,
			partitionKey: {
				name: "orderId",
				type: dynamodb.AttributeType.STRING,
			},
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
		});
	}

	private createAuthorizer(
		userPool: cognito.UserPool
	): apigateway.CognitoUserPoolsAuthorizer {
		return new apigateway.CognitoUserPoolsAuthorizer(
			this,
			"OrdersRestApiCognitoAuthorizer",
			{
				cognitoUserPools: [userPool],
			}
		);
	}

	private createRestApi(): apigateway.RestApi {
		return new apigateway.RestApi(this, "OrdersRestApi", {
			restApiName: `cloud-restaurant-orders-api-${this.env}`,
			defaultCorsPreflightOptions: {
				allowOrigins: apigateway.Cors.ALL_ORIGINS,
				allowMethods: apigateway.Cors.ALL_METHODS,
				allowHeaders: ["Authorization", "Content-Type"],
			},
			deployOptions: {
				stageName: this.env,
			},
		});
	}

	private createRestApiLambda(
		menuTable: dynamodb.Table,
		ordersQueue: sqs.Queue
	): lambda.Function {
		const role = new iam.Role(this, "OrdersRestApiLambdaExecutionRole", {
			assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName(
					"service-role/AWSLambdaBasicExecutionRole"
				),
			],
		});

		role.addToPolicy(
			new iam.PolicyStatement({
				actions: ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:Scan"],
				resources: [menuTable.tableArn],
			})
		);

		role.addToPolicy(
			new iam.PolicyStatement({
				actions: ["sqs:SendMessage"],
				resources: [ordersQueue.queueArn],
			})
		);

		role.addToPolicy(
			new iam.PolicyStatement({
				actions: [
					"logs:CreateLogGroup",
					"logs:CreateLogStream",
					"logs:PutLogEvents",
				],
				resources: ["arn:aws:logs:*:*:*"],
			})
		);

		return new lambda.Function(this, "OrdersRestApiLambda", {
			functionName: `cloud-restaurant-orders-api-${this.env}`,
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
			role,
		});
	}

	private createRestApiResources(
		restApi: apigateway.RestApi,
		restApiLambda: lambda.Function,
		authorizer: apigateway.CognitoUserPoolsAuthorizer
	): void {
		const menuResource = restApi.root.addResource("menu");
		menuResource.addMethod(
			"GET",
			new apigateway.LambdaIntegration(restApiLambda),
			{
				authorizer,
				authorizationType: apigateway.AuthorizationType.COGNITO,
			}
		);

		const ordersResource = restApi.root.addResource("orders");
		ordersResource.addMethod(
			"POST",
			new apigateway.LambdaIntegration(restApiLambda),
			{
				authorizer,
				authorizationType: apigateway.AuthorizationType.COGNITO,
			}
		);

		const helloResource = restApi.root.addResource("hello");
		helloResource.addMethod(
			"GET",
			new apigateway.LambdaIntegration(restApiLambda),
			{
				authorizer,
				authorizationType: apigateway.AuthorizationType.COGNITO,
			}
		);
	}
}
