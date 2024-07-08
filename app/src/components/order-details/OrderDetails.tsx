import React from "react";
import { useParams } from "react-router-dom";
import { Card, Row, Col, Image } from "antd";

const OrderDetails = () => {
	const { orderId } = useParams();

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
							src="https://via.placeholder.com/150"
							alt="Order Image"
							style={{
								width: "100px",
								height: "200px",
								borderRadius: "50%",
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
						<p>Order: Pepperoni Pizza</p>
						<p>Date: Sunday June 30 10:34 AM</p>
						<p>Status: Order received</p>
					</div>
				</Col>
			</Row>
		</Card>
	);
};

export default OrderDetails;
