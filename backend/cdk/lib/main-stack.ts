import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { UsersPoolStack } from "./users-pool-stack";
import { OrdersStack } from "./orders-stack";
import { PaymentStack } from "./payments-stack";
import { OrderPrerationStack } from "./order-preparation-stack";
import { StepFunctionStack } from "./step-function-stack";
import { DeliveryStack } from "./delivery-stack";

export class MainStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const env = this.node.tryGetContext("env");

		const userPoolStack = new UsersPoolStack(
			this,
			`user-pool-stack-${env}`,
			props
		);
		const { userPool } = userPoolStack.boostrap();

		const ordersStack = new OrdersStack(this, `orders-stack-${env}`, props);
		const { ordersRestApi, ordersTable, ordersQueue } =
			ordersStack.boostrap(userPool);

		const paymentStack = new PaymentStack(this, `payment-stack-${env}`, props);
		const { paymentProcessorLambda } = paymentStack.boostrap();

		const orderPeratationStack = new OrderPrerationStack(
			this,
			`order-preparation-stack-${env}`,
			props
		);
		const { orderPreparationLambda, orderPreparationRestApi } =
			orderPeratationStack.boostrap(userPool, ordersTable);

		const deliveryStack = new DeliveryStack(
			this,
			`delivery-stack-${env}`,
			props
		);
		const { deliveryRestApi, deliveryLambda } = deliveryStack.boostrap(
			userPool,
			ordersTable
		);

		const stepFunctionStack = new StepFunctionStack(
			this,
			`step-function-stack-${env}`,
			props
		);
		stepFunctionStack.bootstrap(
			ordersTable,
			paymentProcessorLambda,
			orderPreparationLambda,
			ordersQueue,
			deliveryLambda
		);

		// OUTPUTS
		new cdk.CfnOutput(this, "OrdersRestApiUrl", {
			value: ordersRestApi.url,
		});
		new cdk.CfnOutput(this, "OrderPreparationApi", {
			value: orderPreparationRestApi.url,
		});
		new cdk.CfnOutput(this, "DeliveryApi", {
			value: deliveryRestApi.url,
		});
	}

	private createUserPool(): void {}
}
