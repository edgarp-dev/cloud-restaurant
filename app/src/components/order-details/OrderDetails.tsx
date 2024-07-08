import React from "react";
import { useParams } from "react-router-dom";

const OrderDetails = () => {
	const { orderId } = useParams();

	return (
		<div>
			<h1>Order Details</h1>
			<p>Order ID: {orderId}</p>
			{/* Render the rest of the order details here */}
		</div>
	);
};

export default OrderDetails;
