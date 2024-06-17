import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as sfnTasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import path from "path";

export class StepFunctionStack extends cdk.NestedStack {
	private readonly env: string;

	constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
		super(scope, id, props);

		this.env = this.node.tryGetContext("env");
	}

	public bootstrap(
		ordersTable: dynamodb.Table,
		paymentProcessorLambda: lambda.Function,
		orderPreparationLambda: lambda.Function,
		ordersQueue: sqs.Queue
	): void {
		const putItemIntoOrdersTableStep =
			this.createPutItemOrderToOrderTableStep(ordersTable);

		const processPaymentStep = this.createProcessPaymentStep(
			paymentProcessorLambda
		);

		const updateOrderStatusStep = this.createUpdateOrderStatusStep(ordersTable);

		const waitForOrderPreparationStep = this.createWaitForOrderPreparationStep(
			orderPreparationLambda
		);

		const stepFunctionStepsChain = putItemIntoOrdersTableStep
			.next(processPaymentStep)
			.next(updateOrderStatusStep)
			.next(waitForOrderPreparationStep);

		const processOrderStepFunction = new sfn.StateMachine(
			this,
			"ProcessOrderStepFunction",
			{
				definitionBody: sfn.DefinitionBody.fromChainable(
					stepFunctionStepsChain
				),
				timeout: cdk.Duration.minutes(15),
			}
		);

		this.crateStepFunctionLambdaTrigger(processOrderStepFunction, ordersQueue);
	}

	private createPutItemOrderToOrderTableStep(
		ordersTable: dynamodb.Table
	): cdk.aws_stepfunctions_tasks.DynamoPutItem {
		return new sfnTasks.DynamoPutItem(this, "Put New Order Into Orders Table", {
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
		});
	}

	private createProcessPaymentStep(
		paymentProcessorLambda: lambda.Function
	): cdk.aws_stepfunctions_tasks.LambdaInvoke {
		return new sfnTasks.LambdaInvoke(this, "Process Payment", {
			lambdaFunction: paymentProcessorLambda,
			payload: sfn.TaskInput.fromObject({
				orderId: sfn.JsonPath.stringAt("$.orderId"),
				amount: sfn.JsonPath.stringAt("$.amount"),
				userId: sfn.JsonPath.stringAt("$.userId"),
			}),
			resultPath: "$.paymentResult",
		});
	}

	private createUpdateOrderStatusStep(
		ordersTable: dynamodb.Table
	): cdk.aws_stepfunctions_tasks.DynamoUpdateItem {
		return new sfnTasks.DynamoUpdateItem(this, "Update Order Status", {
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
		});
	}

	private createWaitForOrderPreparationStep(
		orderPreparationLambda: lambda.Function
	): cdk.aws_stepfunctions_tasks.LambdaInvoke {
		return new sfnTasks.LambdaInvoke(this, "Wait For Order Preparation", {
			lambdaFunction: orderPreparationLambda,
			integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
			payload: sfn.TaskInput.fromObject({
				orderId: sfn.JsonPath.stringAt("$.orderId"),
				taskToken: sfn.JsonPath.taskToken,
			}),
			resultPath: "$.orderPreparationResult",
		});
	}

	private crateStepFunctionLambdaTrigger(
		processOrderStepFunction: cdk.aws_stepfunctions.StateMachine,
		ordersQueue: sqs.Queue
	): void {
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
	}
}
