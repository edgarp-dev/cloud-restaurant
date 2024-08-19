import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import path from "path";
import * as fs from "fs-extra";
import { execSync } from "child_process";

type StackOutput = {
	paymentProcessorLambda: lambda.Function;
};

export class PaymentStack extends cdk.NestedStack {
	private readonly env: string;

	constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
		super(scope, id, props);

		this.env = this.node.tryGetContext("env");
	}

	public boostrap(): StackOutput {
		const paymentsTable = this.createPaymentsTable();
		const paymentProcessorLambda =
			this.createPaymentProcessorLambda(paymentsTable);

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

	private createPaymentProcessorLambda(
		paymentsTable: dynamodb.Table
	): lambda.Function {
		const role = new iam.Role(this, "PaymentProcessorLambdaExecutionRole", {
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
					"dynamodb:GetItem",
					"dynamodb:Query",
					"dynamodb:Scan",
					"dynamodb:PutItem",
					"dynamodb:UpdateItem",
					"dynamodb:DeleteItem",
				],
				resources: [paymentsTable.tableArn],
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
							local: {
								tryBundle(outputDir: string) {
									execSync("./build.sh", {
										cwd: path.join(
											__dirname,
											"..",
											"..",
											"payment-processor-lambda"
										),
									});

									const buildPath = path.join(
										__dirname,
										"..",
										"..",
										"payment-processor-lambda",
										"dist"
									);

									fs.copySync(buildPath, outputDir);

									fs.removeSync(buildPath);

									return true;
								},
							},
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
