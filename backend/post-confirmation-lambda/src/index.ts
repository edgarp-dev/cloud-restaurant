import { PostConfirmationTriggerHandler } from "aws-lambda";
import * as AWS from "aws-sdk";

const cognito = new AWS.CognitoIdentityServiceProvider();

export const handler: PostConfirmationTriggerHandler = async (event) => {
	console.log(event);
	const userAttributes = event.request.userAttributes;
	const group = userAttributes["custom:account_type"];
	const userPoolId = event.userPoolId;
	const username = event.userName;

	if (group) {
		const params = {
			GroupName: group,
			UserPoolId: userPoolId,
			Username: username,
		};
		console.log(params);

		try {
			await cognito.adminAddUserToGroup(params).promise();
			console.log(`User ${username} added to group ${group}`);
		} catch (error) {
			console.error(`Error adding user to group: ${(error as Error).message}`);
		}
	}

	return event;
};
