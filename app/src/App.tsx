import React, { useEffect, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { fetchAuthSession } from "@aws-amplify/auth";
import CustomerApp from "./customer/App";
import RestaurantApp from "./restaurant/App";
import DeliveryApp from "./delivery/App";

export default function App() {
	const [userGroups, setUserGroups] = useState<string[]>([]);

	useEffect(() => {
		const fetchUserGroups = async () => {
			try {
				const userSession = await fetchAuthSession();
				const groups =
					userSession.tokens?.idToken?.payload["cognito:groups"] || [];
				console.log(groups);
				setUserGroups(groups as string[]);
			} catch (error) {
				console.error("Error fetching user groups:", error);
			}
		};

		fetchUserGroups();
	}, []);

	return (
		<Router>
			<div style={{ width: "100vw", height: "100vh" }}>
				{userGroups.includes("customers") && <CustomerApp />}
				{userGroups.includes("restaurants") && <RestaurantApp />}
				{userGroups.includes("delivery") && <DeliveryApp />}
			</div>
		</Router>
	);
}
