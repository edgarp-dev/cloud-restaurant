import React from "react";
import { View, Text, Input, SelectField } from "@aws-amplify/ui-react";

const SignUp = () => {
	return (
		<>
			<View>
				<Text>Email</Text>
				<Input
					name="username"
					type="email"
					placeholder="Enter your email"
					required
				/>
			</View>
			<View>
				<Text>Password</Text>
				<Input
					name="password"
					type="password"
					placeholder="Enter your password"
					required
				/>
			</View>
			<View>
				<SelectField
					name="custom:account_type"
					label="Select an option"
					required
				>
					<option value="">Select the account type</option>
					<option value="customers">Customer</option>
					<option value="restaurants">Restaurant</option>
					<option value="delivery">Delivery</option>
				</SelectField>
			</View>
		</>
	);
};

export default SignUp;
