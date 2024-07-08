import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Authenticator } from "@aws-amplify/ui-react";
import type { MenuProps } from "antd";
import { Navbar, NavbarMenuItem } from "./components/ui/navbar";
import Menu from "./components/menu";
import Orders from "./components/orders";
import OrderDetails from './components/order-details'

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

	const links = [
		{ title: "menu", path: "/menu" },
		{ title: "orders", path: "/orders" },
	];

	return (
		<Router>
			<div style={{ width: "100vw", height: "100vh" }}>
				<Navbar menuItems={menuItems} links={links} />
				<Routes>
					<Route path="/" element={<Menu />} />
					<Route path="/menu" element={<Menu />} />
					<Route path="/orders" element={<Orders />} />
					<Route path="/orders/:orderId" element={<OrderDetails />} />
				</Routes>
			</div>
		</Router>
	);
}
