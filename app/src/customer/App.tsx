import React from "react";
import { Route, Routes } from "react-router-dom";
import { Navbar } from "../ui/navbar";
import Menu from "./components/menu";
import Orders from "./components/orders";
import OrderDetails from "./components/order-details";
import NotFound from "../ui/not-found";

const App = () => {
	const links = [
		{ title: "menu", path: "/menu" },
		{ title: "orders", path: "/orders" },
	];

	return (
		<>
			<Navbar links={links} />
			<Routes>
				<Route path="/" element={<Menu />} />
				<Route path="menu" element={<Menu />} />
				<Route path="orders" element={<Orders />} />
				<Route path="orders/:orderId" element={<OrderDetails />} />
				<Route path="*" element={<NotFound />} />
			</Routes>
		</>
	);
};

export default App;
