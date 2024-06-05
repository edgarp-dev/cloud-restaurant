import { Handler } from "aws-lambda";

export const handler: Handler = async (event): Promise<void> => {
	console.log(event);
};
