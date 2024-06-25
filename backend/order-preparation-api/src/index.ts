import { APIGatewayProxyEvent, Context, Handler } from "aws-lambda";
import dotenv from "dotenv";
import Fastify from "fastify";
import awsLambdaFastify from "@fastify/aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
	DynamoDBClient,
	PutItemCommand,
	GetItemCommand,
	UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { SFNClient, SendTaskSuccessCommand } from "@aws-sdk/client-sfn";

dotenv.config();

const fastify = Fastify();
const proxy = awsLambdaFastify(fastify);

const dbClient = new DynamoDBClient();
const sfnClient = new SFNClient();

type StepFunctionEvent = {
	orderId: string;
	taskToken: string;
};

type LambdaEvent = StepFunctionEvent & APIGatewayProxyEvent;

fastify.get("/hello", async (request, reply) => {
	reply.status(200).send({ message: "Hello, World!" });
});

fastify.put("/order/:orderTaskId/in-progress", async (request, reply) => {
	const { orderTaskId } = request.params as {
		orderTaskId: string;
	};

	try {
		const { ORDER_PREPARATION_TABLE, ORDERS_TABLE } = process.env;

		const getItemCommand = new GetItemCommand({
			TableName: ORDER_PREPARATION_TABLE,
			Key: {
				id: {
					S: orderTaskId,
				},
			},
		});
		const orderPreparationTaskReasponse = await dbClient.send(getItemCommand);

		if (!orderPreparationTaskReasponse.Item) {
			reply.status(404).send({ message: "Task not found" });
			return;
		}

		const orderPreparationTask = unmarshall(orderPreparationTaskReasponse.Item);

		const { orderId } = orderPreparationTask;

		const orderPreparationUpdateItemCommand = new UpdateItemCommand({
			TableName: ORDER_PREPARATION_TABLE,
			Key: { id: { S: orderTaskId } },
			UpdateExpression: "SET startedPrerationAt = :startedPrerationAt",
			ExpressionAttributeValues: {
				":startedPrerationAt": {
					S: new Date().toISOString(),
				},
			},
		});
		await dbClient.send(orderPreparationUpdateItemCommand);

		const orderStatusUpdateItemCommand = new UpdateItemCommand({
			TableName: ORDERS_TABLE,
			Key: { orderId: { S: orderId } },
			UpdateExpression: "SET #status = :status",
			ExpressionAttributeValues: {
				":status": {
					S: "ORDER_IN_PROGRESS",
				},
			},
			ExpressionAttributeNames: {
				"#status": "status",
			},
		});

		await dbClient.send(orderStatusUpdateItemCommand);

		reply.status(200).send({ orderTaskId });
	} catch (error) {
		console.error(error);
		reply.status(500).send({ message: "Internal Server Error" });
	}
});

fastify.put(
	"/order/:orderTaskId/preparation-finished",
	async (request, reply) => {
		const { orderTaskId } = request.params as {
			orderTaskId: string;
		};

		try {
			const { ORDER_PREPARATION_TABLE, ORDERS_TABLE } = process.env;

			const getItemCommand = new GetItemCommand({
				TableName: ORDER_PREPARATION_TABLE,
				Key: {
					id: {
						S: orderTaskId,
					},
				},
			});
			const orderPreparationTaskReasponse = await dbClient.send(getItemCommand);

			if (!orderPreparationTaskReasponse.Item) {
				reply.status(404).send({ message: "Task not found" });
				return;
			}

			const orderPreparationTask = unmarshall(
				orderPreparationTaskReasponse.Item
			);

			const { orderId, taskToken } = orderPreparationTask;

			const orderPreparationUpdateItemCommand = new UpdateItemCommand({
				TableName: ORDER_PREPARATION_TABLE,
				Key: { id: { S: orderTaskId } },
				UpdateExpression: "SET finishedAt = :finishedAt",
				ExpressionAttributeValues: {
					":finishedAt": {
						S: new Date().toISOString(),
					},
				},
			});
			await dbClient.send(orderPreparationUpdateItemCommand);

			const orderStatusUpdateItemCommand = new UpdateItemCommand({
				TableName: ORDERS_TABLE,
				Key: { orderId: { S: orderId } },
				UpdateExpression: "SET #status = :status",
				ExpressionAttributeValues: {
					":status": {
						S: "ORDER_WAITING_PICK_UP",
					},
				},
				ExpressionAttributeNames: {
					"#status": "status",
				},
			});

			await dbClient.send(orderStatusUpdateItemCommand);

			const sendTaskSuccessCommand = new SendTaskSuccessCommand({
				taskToken,
				output: JSON.stringify({ orderId }),
			});
			await sfnClient.send(sendTaskSuccessCommand);

			reply.status(200).send({ orderTaskId });
		} catch (error) {
			console.error(error);
			reply.status(500).send({ message: "Internal Server Error" });
		}
	}
);

export const handler: Handler = async (
	event: LambdaEvent,
	context: Context
) => {
	if (event.taskToken) {
		console.log("STEP FUNCTION EVENT");
		return handleStepFunctionEvent(event);
	}

	console.log("API GATEWAY EVENT");
	return proxy(event, context);
};

const handleStepFunctionEvent = async (event: LambdaEvent): Promise<void> => {
	const { orderId, taskToken } = event;

	const orderPreparationTask = {
		id: uuidv4(),
		orderId,
		taskToken,
		startedAt: new Date().toISOString(),
		startedPrerationAt: "NOT_PREPARED",
		finishedAt: "UNFINISHED",
	};

	try {
		const putItemCommand = new PutItemCommand({
			TableName: process.env.ORDER_PREPARATION_TABLE,
			Item: marshall(orderPreparationTask),
		});

		const response = await dbClient.send(putItemCommand);
		console.log("ORDER PREPARATION TASK SAVED SUCCESSFULLY:", response);
	} catch (error) {
		console.error(error);
	}
};

// Start server locally if not in Lambda environment
if (require.main === module) {
	const start = async () => {
		try {
			await fastify.listen({ port: 6000 });
			console.log(`Server is running at http://localhost:6000`);
		} catch (err) {
			fastify.log.error(err);
			process.exit(1);
		}
	};

	start();
}
