import { SQSHandler } from "aws-lambda";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";

const client = new SFNClient({});

export const handler: SQSHandler = async (event) => {
	for (const record of event.Records) {
		const body = JSON.parse(record.body);

		const params = {
			stateMachineArn: process.env.STATE_MACHINE_ARN,
			input: JSON.stringify(body),
		};

		const command = new StartExecutionCommand(params);

		try {
			await client.send(command);
			console.log(`Started execution for ${JSON.stringify(body)}`);
		} catch (error) {
			console.error(`Error starting execution: ${error}`);
		}
	}
};
