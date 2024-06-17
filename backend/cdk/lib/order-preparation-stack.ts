import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cognito from "aws-cdk-lib/aws-cognito";
import path from "path";

type StackOutput = {
	orderPreparationLambda: lambda.Function;
	orderPreparationRestApi: apigateway.RestApi;
};

export class OrderPrerationStack extends cdk.NestedStack {
	private readonly env: string;

	constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
		super(scope, id, props);

		this.env = this.node.tryGetContext("env");
	}

	public boostrap(
		userPool: cognito.UserPool,
		ordersTable: dynamodb.Table
	): StackOutput {
		const orderPreparationTable = this.createOrderPreparationTable();
		const apiAuthorizer = this.createApiAuthorizer(userPool);
		const orderPreparationRestApi = this.createRestApi();
		const orderPreparationLambda = this.createOrderPreparationLambda(
			orderPreparationTable,
			ordersTable
		);
		this.createRestApiReources(
			orderPreparationRestApi,
			apiAuthorizer,
			orderPreparationLambda
		);

		return { orderPreparationLambda, orderPreparationRestApi };
	}

	private createOrderPreparationTable(): dynamodb.Table {
		return new dynamodb.Table(this, "OrderPreparationTable", {
			tableName: `cloud-restaurant-order-preparation-db-${this.env}`,
			partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
		});
	}

	private createApiAuthorizer(
		userPool: cognito.UserPool
	): apigateway.CognitoUserPoolsAuthorizer {
		return new apigateway.CognitoUserPoolsAuthorizer(
			this,
			"OrderPreparationApiCognitoAuthorizer",
			{
				cognitoUserPools: [userPool],
			}
		);
	}

	private createRestApi(): apigateway.RestApi {
		const orderPreparationApi = new apigateway.RestApi(
			this,
			"CloudRestaurantOrderPreparationRestApi",
			{
				restApiName: `cloud-restaurant-order-preparation-api-${this.env}`,
				defaultCorsPreflightOptions: {
					allowOrigins: apigateway.Cors.ALL_ORIGINS,
					allowMethods: apigateway.Cors.ALL_METHODS,
					allowHeaders: ["Authorization", "Content-Type"],
				},
				deployOptions: {
					stageName: this.env,
				},
			}
		);

		return orderPreparationApi;
	}

	private createOrderPreparationLambda(
		orderPreparationTable: dynamodb.Table,
		ordersTable: dynamodb.Table
	): lambda.Function {
		const orderPreparationApiLambdaRole = new iam.Role(this, "LambdaRole", {
			assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName(
					"service-role/AWSLambdaBasicExecutionRole"
				),
			],
		});
		orderPreparationApiLambdaRole.addManagedPolicy(
			iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess")
		);
		orderPreparationApiLambdaRole.addManagedPolicy(
			iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsFullAccess")
		);
		orderPreparationApiLambdaRole.addManagedPolicy(
			iam.ManagedPolicy.fromAwsManagedPolicyName("AWSStepFunctionsFullAccess")
		);

		const orderPreparationApiLambda = new lambda.Function(
			this,
			"OrderPreparationApiLambda",
			{
				functionName: `cloud-restaurant-order-preparation-api-${this.env}`,
				runtime: lambda.Runtime.NODEJS_20_X,
				handler: "index.handler",
				code: lambda.Code.fromAsset(
					path.join(__dirname, "..", "..", "order-preparation-api"),
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
					ORDER_PREPARATION_TABLE: orderPreparationTable.tableName,
					ORDERS_TABLE: ordersTable.tableName,
				},
				role: orderPreparationApiLambdaRole,
			}
		);

		return orderPreparationApiLambda;
	}

	private createRestApiReources(
		orderPreparationApi: apigateway.RestApi,
		orderPreparationApiAuthorizer: apigateway.CognitoUserPoolsAuthorizer,
		orderPreparationApiLambda: lambda.Function
	): void {
		const orderPreparationHelloResource =
			orderPreparationApi.root.addResource("hello");
		orderPreparationHelloResource.addMethod(
			"GET",
			new apigateway.LambdaIntegration(orderPreparationApiLambda),
			{
				authorizer: orderPreparationApiAuthorizer,
				authorizationType: apigateway.AuthorizationType.COGNITO,
			}
		);

		const orderTaskResource = orderPreparationApi.root
			.addResource("order")
			.addResource("{orderTaskId}");

		const orderPreparationApiReceivedResource =
			orderTaskResource.addResource("in-progress");
		orderPreparationApiReceivedResource.addMethod(
			"PUT",
			new apigateway.LambdaIntegration(orderPreparationApiLambda),
			{
				authorizer: orderPreparationApiAuthorizer,
				authorizationType: apigateway.AuthorizationType.COGNITO,
			}
		);

		const orderPreparationApiPrepararionFinishedResource =
			orderTaskResource.addResource("preparation-finished");
		orderPreparationApiPrepararionFinishedResource.addMethod(
			"PUT",
			new apigateway.LambdaIntegration(orderPreparationApiLambda),
			{
				authorizer: orderPreparationApiAuthorizer,
				authorizationType: apigateway.AuthorizationType.COGNITO,
			}
		);
	}
}
