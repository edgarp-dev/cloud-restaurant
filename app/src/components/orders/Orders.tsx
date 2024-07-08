import React from "react";
import { useNavigate } from "react-router-dom";
import { userOrdersByUser } from "../../api";
import Loader from "../ui/loader";
import OrdersTable from "./OrdersTable";
import Empty from "../ui/empty";
import Order from "../../core/Order";

const OrdersList = () => {
	const { status, data } = userOrdersByUser();
	const navigate = useNavigate();

	if (status === "pending") return <Loader />;

	if (!data || data.length === 0) return <Empty description="No orders" />;

	const onRowClick = (order: Order) => {
		const { id } = order;
		navigate(`/orders/${id}`);
	}

	return <OrdersTable orders={data} onRowClick={onRowClick} />;
};

export default OrdersList;
