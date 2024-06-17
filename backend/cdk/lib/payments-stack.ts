import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import path from "path";

type StackOutput = {
	paymentProcessorLambda: lambda.Function;
};

export default class PaymentStack extends cdk.Stack {
	private readonly env: string;

	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		this.env = this.node.tryGetContext("env");
	}

	public boostrap(): StackOutput {
		const paymentsTable = this.createPaymentsTable();
		const paymentProcessorLambda = this.createPaymentProcessor(paymentsTable);

		return { paymentProcessorLambda };
	}

	private createPaymentsTable(): dynamodb.Table {
		return new dynamodb.Table(this, "PaymentsTable", {
			tableName: `cloud-restaurant-payments-db-${this.env}`,
			partitionKey: {
				name: "paymentId",
				type: dynamodb.AttributeType.STRING,
			},
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
		});
	}

	private createPaymentProcessor(
		paymentsTable: dynamodb.Table
	): lambda.Function {
		const paymentProcessor = new lambda.Function(
			this,
			"PaymentProcessorLambda",
			{
				functionName: `cloud-restaurant-payment-processor-${this.env}`,
				runtime: lambda.Runtime.NODEJS_20_X,
				handler: "index.handler",
				code: lambda.Code.fromAsset(
					path.join(__dirname, "..", "..", "payment-processor-lambda"),
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
					PAYMENTS_TABLE: paymentsTable.tableName,
				},
			}
		);

		paymentsTable.grantReadWriteData(paymentProcessor);

		return paymentProcessor;
	}
}
