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
		status: 'PAYMENT_SUCCESSFUL',
		userId
	};

	const params = {
		TableName: process.env.PAYMENTS_TABLE,
		Item: marshall(payment),
	};

	try {
		const command = new PutItemCommand(params);
		await client.send(command);
		console.log("Payment processed successfully");

		const updateParams = {
			TableName: process.env.ORDERS_TABLE_NAME,
			Key: marshall({ orderId }),
			UpdateExpression: "set orderStatus = :status",
			ExpressionAttributeValues: marshall({
				":status": "ORDER_IN_PROCESS",
			}),
		};
	} catch (error) {
		console.error((error as Error).message);
	}
};
