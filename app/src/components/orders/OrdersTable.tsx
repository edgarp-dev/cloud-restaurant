import React, { useState, useEffect } from "react";
import { Table } from "antd";
import Order from "../../core/Order";

type Props = {
	orders: Order[];
};

const columns = [
	{
		title: "Date",
		dataIndex: "date",
		key: "date",
	},
	{
		title: "Status",
		dataIndex: "status",
		key: "status",
	},
];

const OrdersTable = ({ orders }: Props) => {
	const [pageSize, setPageSize] = useState<number>(10);

	useEffect(() => {
		const updatePageSize = () => {
			const availableHeight = window.innerHeight - 200; // Adjust 200 to match your header/footer height
			const rowHeight = 54; // Approximate height of a table row
			const newPageSize = Math.floor(availableHeight / rowHeight);
			setPageSize(newPageSize);
		};

		updatePageSize();
		window.addEventListener("resize", updatePageSize);

		return () => {
			window.removeEventListener("resize", updatePageSize);
		};
	}, []);

	return (
		<Table
			dataSource={orders}
			rowKey="id"
			columns={columns}
			pagination={{ pageSize }}
		/>
	);
};

export default OrdersTable;
