import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import Fastify from "fastify";
import awsLambdaFastify from "@fastify/aws-lambda";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({});
const fastify = Fastify();

fastify.get("/hello", async (request, reply) => {
	reply.status(200).send({ message: "Hello, World!" });
});

fastify.get("/menu", async (request, reply) => {
	const params = {
		TableName: process.env.TABLE_NAME,
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

fastify.post("/orders/:menuId", async (request, reply) => {
	const { menuId } = request.params as { menuId: string };
	const { userId, quantity } = request.body as {
		userId: string;
		quantity: number;
	};

	console.log(menuId, userId, quantity);
});

export const handler: APIGatewayProxyHandlerV2 = awsLambdaFastify(fastify);
