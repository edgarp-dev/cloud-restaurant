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
				const { orderId, status, orderDate } = unmarshall(item);
				const order = {
					id: orderId,
					status,
					date: orderDate,
				};
				orders.push(order);
			}
		}

		reply.status(200).send(orders);
	} catch (error) {
		console.error(error);

		reply.status(500).send({ message: "Internal Server Error" });
	}
});

fastify.get("/orders/:userId/:orderId", async (request, reply) => {
	const { orderId } = request.params as {
		userId: string;
		orderId: string;
	};

	try {
		const orderQueryParams = {
			TableName: process.env.ORDERS_TABLE,
			KeyConditionExpression: "orderId = :orderId",
			ExpressionAttributeValues: {
				":orderId": {
					S: orderId,
				},
			},
		};

		const orderDbRespose = await client.send(
			new QueryCommand(orderQueryParams)
		);

		if (
			!orderDbRespose ||
			!orderDbRespose.Items ||
			orderDbRespose.Items.length === 0
		) {
			return reply.status(404).send({ message: "Order not found" });
		}

		const order = unmarshall(orderDbRespose.Items[0]);
		const { menuId } = order;

		const menuQueryParams = {
			TableName: process.env.MENU_TABLE,
			KeyConditionExpression: "Id = :menuId",
			ExpressionAttributeValues: {
				":menuId": {
					S: menuId,
				},
			},
		};
		const menuDbResponse = await client.send(new QueryCommand(menuQueryParams));

		if (
			!menuDbResponse ||
			!menuDbResponse.Items ||
			menuDbResponse.Items.length === 0
		) {
			return reply.status(404).send({ message: "Order not found" });
		}

		const menu = unmarshall(menuDbResponse.Items[0]);

		const { orderDate, quantity, status, amount } = order;
		const { ImageSrc, Name, Price } = menu;

		const orderDetails = {
			orderDate,
			quantity,
			status,
			amount,
			menuDetails: {
				imageSrc: ImageSrc,
				name: Name,
				price: Price,
			},
		};

		return reply.status(200).send(orderDetails);
	} catch (error) {
		console.error(error);

		return reply.status(500).send({ message: "Internal Server Error" });
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
