import { APIGatewayProxyEvent, Context, Handler } from "aws-lambda";
import dotenv from "dotenv";
import Fastify from "fastify";
import awsLambdaFastify from "@fastify/aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SFNClient, SendTaskSuccessCommand } from "@aws-sdk/client-sfn";
import { marshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";

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

	const deliveryTask = {
		id: uuidv4(),
		orderId,
		taskToken,
		status: "NOT_PICKED",
		deliveryUserId: "",
	};

	try {
		const putItemCommand = new PutItemCommand({
			TableName: process.env.DELIVERY_TABLE,
			Item: marshall(deliveryTask),
		});

		const response = await dbClient.send(putItemCommand);
		console.log("DELIVERY TASK SAVED SUCCESSFULLY:", response);
	} catch (error) {
		console.error(error);
	}
};

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
