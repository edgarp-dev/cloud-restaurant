import { Handler } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient();

export const handler: Handler = async (event): Promise<void> => {
	const { orderId, amount, userId } = event;

	const payment = {
		paymentId: uuidv4(),
		orderId,
		date: new Date().toISOString(),
		amount,
		status: 'PAYMENT_SUCCESSFUL'
	};

	const params = {
		TableName: process.env.PAYMENTS_TABLE,
		Item: marshall(payment),
	};

	try {
		const command = new PutItemCommand(params);
		await client.send(command);
		console.log("Payment processed successfully");
	} catch (error) {
		console.error((error as Error).message);
	}
};
