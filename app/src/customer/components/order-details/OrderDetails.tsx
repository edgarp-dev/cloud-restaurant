import React from "react";
import { useParams } from "react-router-dom";
import { Card, Row, Col, Image } from "antd";
import { useOrderDetails } from "../../../api";

const OrderDetails = () => {
	const { orderId } = useParams();
	const { status: requestStatus, data: orderDetails } = useOrderDetails(
		orderId as string
	);

	if (!orderDetails) return <>Order not found</>;

	const { menuImage, menuName, menuPrice, date, status, quantity, amount } =
		orderDetails;

	return (
		<Card
			style={{
				borderRadius: "10px",
			}}
		>
			<Row>
				<Col span={6}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							height: "100%",
						}}
					>
						<Image
							src={menuImage}
							alt="Order Image"
							style={{
								width: "200px",
								height: "200px",
								borderRadius: "5%",
								objectFit: "cover",
							}}
							preview={false}
						/>
					</div>
				</Col>
				<Col span={18}>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							justifyContent: "center",
							height: "100%",
						}}
					>
						<p>Order: {menuName}</p>
						<p>Price: {menuPrice}</p>
						<p>Date: {date}</p>
						<p>Status: {status}</p>
						<p>Quantity: {quantity}</p>
						<p>Total: {amount}</p>
					</div>
				</Col>
			</Row>
		</Card>
	);
};

export default OrderDetails;
