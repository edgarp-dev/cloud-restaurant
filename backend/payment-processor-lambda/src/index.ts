import { Handler } from "aws-lambda";

export const handler: Handler = async (event) => {
	const { orderId } = event;

	console.log(`>>>>>>>>> ${orderId}`);
};
