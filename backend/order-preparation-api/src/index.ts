import { APIGatewayProxyEvent, Context, Handler } from "aws-lambda";
import dotenv from "dotenv";
import Fastify from "fastify";
import awsLambdaFastify from "@fastify/aws-lambda";

dotenv.config();

const fastify = Fastify();
const proxy = awsLambdaFastify(fastify);

type StepFunctionEvent = {
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
	console.log(event);
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
