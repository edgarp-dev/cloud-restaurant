import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as sfnTasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import path from "path";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { UsersPoolStack } from "./users-pool-stack";
import { OrdersStack } from "./orders-stack";
import PaymentStack from "./payments-stack";

export class MainStack extends cdk.Stack {
	private readonly env: string;

	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		this.env = this.node.tryGetContext("env");

		const userPoolStack = new UsersPoolStack(scope, id, props);
		const { userPool } = userPoolStack.boostrap();

		const ordersStack = new OrdersStack(scope, id, props);
		const { ordersRestApi, ordersTable, ordersQueue } = ordersStack.boostrap(userPool);

		const paymentStack = new PaymentStack(scope, id, props);
		const { paymentProcessorLambda } = paymentStack.boostrap();

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
					amount: sfnTasks.DynamoAttributeValue.fromString(
						sfn.JsonPath.stringAt("$.amount")
					),
					orderDate: sfnTasks.DynamoAttributeValue.fromString(
						sfn.JsonPath.stringAt("$.orderDate")
					),
					status: sfnTasks.DynamoAttributeValue.fromString(
						sfn.JsonPath.stringAt("$.status")
					),
				},
				resultPath: "$.dynamodbResult",
			}
		);

		const processPaymentStep = new sfnTasks.LambdaInvoke(
			this,
			"Process Payment Step",
			{
				lambdaFunction: paymentProcessorLambda,
				payload: sfn.TaskInput.fromObject({
					orderId: sfn.JsonPath.stringAt("$.orderId"),
					amount: sfn.JsonPath.stringAt("$.amount"),
					userId: sfn.JsonPath.stringAt("$.userId"),
				}),
				resultPath: "$.paymentResult",
			}
		);

		const updateOrderStatusStep = new sfnTasks.DynamoUpdateItem(
			this,
			"Update Order Status Step",
			{
				table: ordersTable,
				key: {
					orderId: sfnTasks.DynamoAttributeValue.fromString(
						sfn.JsonPath.stringAt("$.orderId")
					),
				},
				updateExpression: "SET #orderStatus = :status",
				expressionAttributeValues: {
					":status": sfnTasks.DynamoAttributeValue.fromString("ORDER_RECEIVED"),
				},
				expressionAttributeNames: {
					"#orderStatus": "status",
				},
				resultPath: "$.updateResult",
			}
		);

		const orderPreparationTable = new dynamodb.Table(
			this,
			"CloudRestaurantOrderPreparationTable",
			{
				tableName: `cloud-restaurant-order-preparation-${this.env}`,
				partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
				billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			}
		);

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

		const orderPreparationApiAuthorizer =
			new apigateway.CognitoUserPoolsAuthorizer(
				this,
				"OrderPreparationApiCognitoAuthorizer",
				{
					cognitoUserPools: [userPool],
				}
			);

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
			"CloudRestaurantOrderPreparationApiLambda",
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

		const orderPreparationProcessorStep = new sfnTasks.LambdaInvoke(
			this,
			"Post Status Update Step",
			{
				lambdaFunction: orderPreparationApiLambda,
				integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
				payload: sfn.TaskInput.fromObject({
					orderId: sfn.JsonPath.stringAt("$.orderId"),
					taskToken: sfn.JsonPath.taskToken,
				}),
				resultPath: "$.orderPreparationResult",
			}
		);

		const chain = processOrderStep
			.next(processPaymentStep)
			.next(updateOrderStatusStep)
			.next(orderPreparationProcessorStep);

		const processOrderStepFunction = new sfn.StateMachine(
			this,
			"ProcessOrderStepFunction",
			{
				definitionBody: sfn.DefinitionBody.fromChainable(chain),
				timeout: cdk.Duration.minutes(15),
			}
		);

		const triggerStepFunctionLambda = new lambda.Function(
			this,
			"TriggerStepFunctionLambda",
			{
				functionName: `cloud-restaurant-step-function-trigger-${this.env}`,
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

		// OUTPUTS
		new cdk.CfnOutput(this, "OrdersRestApiUrl", {
			value: ordersRestApi.url,
		});
		new cdk.CfnOutput(this, "OrderPreparationApi", {
			value: orderPreparationApi.url,
		});
	}

	private createUserPool(): void {}
}
