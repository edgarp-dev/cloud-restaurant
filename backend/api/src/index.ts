import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import Fastify from "fastify";
import awsLambdaFastify from "@fastify/aws-lambda";
import {
	DynamoDBClient,
	ScanCommand,
	QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const client = new DynamoDBClient();
const sqsClient = new SQSClient();

const fastify = Fastify();

fastify.get("/hello", async (request, reply) => {
	reply.status(200).send({ message: "Hello, World!" });
});

fastify.get("/menu", async (request, reply) => {
	const params = {
		TableName: process.env.MENU_TABLE,
	};

	try {
		const command = new ScanCommand(params);
		const data = await client.send(command);

		const parsedItems: Record<string, any> = [];

		if (data.Items) {
			for (const item of data?.Items) {
				parsedItems.push(unmarshall(item));
			}
		}

		reply.status(200).send(parsedItems);
	} catch (error) {
		reply.status(500).send({ error: (error as Error).message });
	}
});

fastify.post("/orders", async (request, reply) => {
	const { userId, quantity, menuId, price } = request.body as {
		userId: string;
		menuId: string;
		quantity: number;
		price: number;
	};

	const orderDate = new Date().toISOString();
	const orderId = uuidv4();
	const order = {
		orderId,
		menuId,
		userId,
		quantity: quantity.toString(),
		amount: (quantity * price).toString(),
		orderDate,
		status: "ORDER_CREATED",
	};

	try {
		const sqsParams = {
			QueueUrl: process.env.ORDERS_QUEUE_URL,
			MessageBody: JSON.stringify(order),
		};

		const sqsCommand = new SendMessageCommand(sqsParams);
		await sqsClient.send(sqsCommand);

		reply.status(201).send({ orderId });
	} catch (error) {
		console.error(error);
		reply.status(500).send({ error: "Internal Server Error" });
	}
});

fastify.get("/orders/:userId", async (request, reply) => {
	const { userId } = request.params as {
		userId: string;
	};

	try {
		const queryParams = {
			TableName: process.env.ORDERS_TABLE,
			IndexName: "UserIdIndex",
			KeyConditionExpression: "userId = :userId",
			ExpressionAttributeValues: {
				":userId": {
					S: userId,
				},
			},
		};

		const data = await client.send(new QueryCommand(queryParams));

		const orders: Record<string, any>[] = [];

		if (data.Items) {
			for (const item of data.Items) {
				orders.push(unmarshall(item));
			}
		}

		reply.status(200).send(orders);
	} catch (error) {
		console.error(error);

		reply.status(500).send({ message: "Internal Server Error" });
	}
});

export const handler: APIGatewayProxyHandlerV2 = awsLambdaFastify(fastify);

// Start server locally if not in Lambda environment
if (require.main === module) {
	const start = async () => {
		try {
			await fastify.listen({ port: 5000 });
			console.log(`Server is running at http://localhost:5000`);
		} catch (err) {
			fastify.log.error(err);
			process.exit(1);
		}
	};

	start();
}
