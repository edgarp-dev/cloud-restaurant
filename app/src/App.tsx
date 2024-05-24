import React, { useEffect } from "react";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import type { MenuProps } from "antd";
import "@aws-amplify/ui-react/styles.css";
import awsExports from "./aws-exports";
import ApliClient from "./api/ApiClient";
import { Navbar, NavbarMenuItem } from "./components/ui/navbar";

Amplify.configure(awsExports);

export default function App() {
	useEffect(() => {
		(async function () {
			const apiClient = await ApliClient.getInstance();
			await apiClient.get("/hello");
		})();
	}, []);

	const menuItems: MenuProps["items"] = [
		{
			key: "1",
			label: (
				<Authenticator>
					{({ signOut }) => (
						<NavbarMenuItem key="logout" text="Logout" onClick={signOut} />
					)}
				</Authenticator>
			),
		},
	];

	return (
		<Authenticator>
			<main>
				<Navbar menuItems={menuItems} />
			</main>
		</Authenticator>
	);
}
