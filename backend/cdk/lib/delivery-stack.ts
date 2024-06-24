import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import path from "path";

type StackOutput = {
	deliveryRestApi: apigateway.RestApi;
	deliveryLambda: lambda.Function;
};

export class DeliveryStack extends cdk.NestedStack {
	private readonly env: string;

	constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
		super(scope, id, props);

		this.env = this.node.tryGetContext("env");
	}

	public boostrap(
		userPool: cognito.UserPool,
		ordersTable: dynamodb.Table
	): StackOutput {
		const deliveryTable = this.createDeliveryTable();
		const apiAuthorizer = this.createApiAuthorizer(userPool);
		const deliveryRestApi = this.createRestApi();
		const deliveryRestApiLambda = this.createDeliveyLambda(
			deliveryTable,
			ordersTable
		);
		this.createRestApiResources(
			deliveryRestApi,
			apiAuthorizer,
			deliveryRestApiLambda
		);

		return { deliveryRestApi, deliveryLambda: deliveryRestApiLambda };
	}

	private createDeliveryTable(): dynamodb.Table {
		return new dynamodb.Table(this, "DeliveryTable", {
			tableName: `cloud-restaurant-delivery-db-${this.env}`,
			partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
		});
	}

	private createApiAuthorizer(
		userPool: cognito.UserPool
	): apigateway.CognitoUserPoolsAuthorizer {
		return new apigateway.CognitoUserPoolsAuthorizer(
			this,
			"DeliveryApiCognitoAuthorizer",
			{
				cognitoUserPools: [userPool],
			}
		);
	}

	private createRestApi(): apigateway.RestApi {
		return new apigateway.RestApi(this, "DeliveryRestApi", {
			restApiName: `cloud-restaurant-delivery-api-${this.env}`,
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

	private createDeliveyLambda(
		deliveryTable: dynamodb.Table,
		ordersTable: dynamodb.Table
	): lambda.Function {
		const role = new iam.Role(this, "DeliveryRestApiLambdaRole", {
			assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName(
					"service-role/AWSLambdaBasicExecutionRole"
				),
			],
		});

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

		role.addManagedPolicy(
			iam.ManagedPolicy.fromAwsManagedPolicyName("AWSStepFunctionsFullAccess")
		);

		const deliveryRestApiLambda = new lambda.Function(
			this,
			"DeliveryApiLambda",
			{
				functionName: `cloud-restaurant-delivery-api-${this.env}`,
				runtime: lambda.Runtime.NODEJS_20_X,
				handler: "index.handler",
				code: lambda.Code.fromAsset(
					path.join(__dirname, "..", "..", "delivery-api"),
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
					DELIVERY_TABLE: deliveryTable.tableName,
					ORDERS_TABLE: ordersTable.tableName,
				},
				role,
			}
		);

		return deliveryRestApiLambda;
	}

	private createRestApiResources(
		deliveryApi: apigateway.RestApi,
		deliveryApiAuthorizer: apigateway.CognitoUserPoolsAuthorizer,
		deliveryApiLambda: lambda.Function
	): void {
		const helloResource = deliveryApi.root.addResource("hello");
		helloResource.addMethod(
			"GET",
			new apigateway.LambdaIntegration(deliveryApiLambda),
			{
				authorizer: deliveryApiAuthorizer,
				authorizationType: apigateway.AuthorizationType.COGNITO,
			}
		);
	}
}
