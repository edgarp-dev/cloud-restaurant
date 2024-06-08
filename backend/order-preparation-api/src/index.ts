import { APIGatewayProxyEvent, Context, Handler } from "aws-lambda";
import dotenv from "dotenv";
import Fastify from "fastify";
import awsLambdaFastify from "@fastify/aws-lambda";
import { v4 as uuidv4 } from "uuid";
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { PutCommand } = require("@aws-sdk/lib-dynamodb");

dotenv.config();

const fastify = Fastify();
const proxy = awsLambdaFastify(fastify);

const dbClient = new DynamoDBClient();

type StepFunctionEvent = {
	orderId: string;
	taskToken: string;
};

type LambdaEvent = StepFunctionEvent & APIGatewayProxyEvent;

fastify.get("/hello", async (request, reply) => {
	reply.status(200).send({ message: "Hello, World!" });
});

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
		finishedAt: "UNFINISHED",
	};

	try {
		const putItemCommand = new PutCommand({
			TableName: process.env.ORDER_PREPARATION_TABLE,
			Item: orderPreparationTask,
		});

		const response = await dbClient.send(putItemCommand);
		console.log("ORDER PREPARATION TASK INSERTED SUCCESSFULLY:", response);
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
