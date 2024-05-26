import React from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import type { MenuProps } from "antd";
import { Navbar, NavbarMenuItem } from "./components/ui/navbar";
import Menu from "./components/menu";

export default function App() {
	const menuItems: MenuProps["items"] = [
		{
			key: "1",
			label: (
				<Authenticator>
					{({ signOut }) => <NavbarMenuItem text="Logout" onClick={signOut} />}
				</Authenticator>
			),
		},
	];

	return (
		<div style={{ width: "100vw", height: "100vh" }}>
			<Navbar menuItems={menuItems} />
			<Menu />
		</div>
	);
}
