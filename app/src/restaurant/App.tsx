import React from "react";
import { Route, Routes } from "react-router-dom";
import { Navbar } from "../ui/navbar";
import Orders from "./components/orders";
import NotFound from "../ui/not-found";

const App = () => {
	const links = [{ title: "orders", path: "/orders" }];

	return (
		<>
			<Navbar links={links} />
			<Routes>
				<Route path="/" element={<Orders />} />
				<Route path="/orders" element={<Orders />} />
				<Route path="*" element={<NotFound />} />
			</Routes>
		</>
	);
};

export default App;
