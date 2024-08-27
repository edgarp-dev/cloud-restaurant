import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as sns from "aws-cdk-lib/aws-sns";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import path from "path";
import * as fs from "fs-extra";
import { execSync } from "child_process";

type StackOuput = {
	restaurantsTopic: sns.Topic;
};

export class NotificationsStack extends cdk.NestedStack {
	private readonly env: string;

	constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
		super(scope, id, props);

		this.env = this.node.tryGetContext("env");
	}

	public boostrap(userPool: cognito.UserPool): StackOuput {
		const customerTopic = this.createCustomerTopic();
		const restaurantsTopic = this.createRestaurantTopic();
		const deliveryTopic = this.createDeliveryTopic();

		const notificationsTable = this.createNotificationsTable();
		const authorizer = this.createAuthorizer(userPool);
		const restApi = this.createRestApi();
		const restApiLambda = this.createRestApiLambda(notificationsTable);
		this.createRestApiResources(restApi, restApiLambda, authorizer);

		return { restaurantsTopic };
	}

	private createCustomerTopic(): sns.Topic {
		return new sns.Topic(this, "CustomerSNSTopic", {
			displayName: `cloud-restaurant-customer-topic-${this.env}`,
		});
	}

	private createRestaurantTopic(): sns.Topic {
		return new sns.Topic(this, "RestaurantSNSTopic", {
			displayName: `cloud-restaurant-restaurant-topic-${this.env}`,
		});
	}

	private createDeliveryTopic(): sns.Topic {
		return new sns.Topic(this, "DeliveryrSNSTopic", {
			displayName: `cloud-restaurant-delivery-topic-${this.env}`,
		});
	}

	private createNotificationsTable(): dynamodb.Table {
		return new dynamodb.Table(this, "NotificationsTable", {
			tableName: `cloud-restaurant-orders-${this.env}`,
			partitionKey: {
				name: "id",
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
			"NotificationsRestApiCognitoAuthorizer",
			{
				cognitoUserPools: [userPool],
			}
		);
	}

	private createRestApi(): apigateway.RestApi {
		return new apigateway.RestApi(this, "NotificationsRestApi", {
			restApiName: `cloud-restaurant-notifications-api-${this.env}`,
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
		notificationsTable: dynamodb.Table
	): lambda.Function {
		const role = new iam.Role(this, "NotificationsRestApiLambdaExecutionRole", {
			assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName(
					"service-role/AWSLambdaBasicExecutionRole"
				),
			],
		});

		role.addToPolicy(
			new iam.PolicyStatement({
				actions: ["dynamodb:PutItem"],
				resources: [notificationsTable.tableArn],
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

		return new lambda.Function(this, "NotificationsRestApiLambda", {
			functionName: `cloud-restaurant-orders-api-${this.env}`,
			runtime: lambda.Runtime.NODEJS_20_X,
			handler: "src/index.handler",
			timeout: cdk.Duration.seconds(30),
			code: lambda.Code.fromAsset(
				path.join(__dirname, "..", "..", "notifications-api"),
				{
					bundling: {
						image: lambda.Runtime.NODEJS_20_X.bundlingImage,
						local: {
							tryBundle(outputDir: string) {
								execSync("./build.sh", {
									cwd: path.join(__dirname, "..", "..", "notifications-api"),
								});

								const buildPath = path.join(
									__dirname,
									"..",
									"..",
									"notifications-api",
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
				NOTIFICATIOBS_TABLE: notificationsTable.tableName,
			},
			role,
		});
	}

	private createRestApiResources(
		restApi: apigateway.RestApi,
		restApiLambda: lambda.Function,
		authorizer: apigateway.CognitoUserPoolsAuthorizer
	): void {
		const notificationResource = restApi.root.addResource("notification");

		const subscribeResource = notificationResource.addResource("subscribe");
		subscribeResource.addMethod(
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
