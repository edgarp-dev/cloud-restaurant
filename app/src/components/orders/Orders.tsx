import React from "react";
import { userOrdersByUser } from "../../api";
import Loader from "../ui/loader";
import OrdersTable from "./OrdersTable";
import Empty from "../ui/empty";

const OrdersList = () => {
	const { status, data } = userOrdersByUser();

	if (status === "pending") return <Loader />;

	if (!data || data.length === 0) return <Empty description="No orders" />;

	return <OrdersTable orders={data} />;
};

export default OrdersList;
