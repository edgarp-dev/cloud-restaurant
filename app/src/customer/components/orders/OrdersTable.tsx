import React, { useState, useEffect } from "react";
import { Table } from "antd";
import Order from "../../../core/Order";

type Props = {
	orders: Order[];
	onRowClick: (order: Order) => void;
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

const OrdersTable = ({ orders, onRowClick }: Props) => {
	const [pageSize, setPageSize] = useState<number>(10);

	useEffect(() => {
		const updatePageSize = () => {
			const availableHeight = window.innerHeight - 200;
			const rowHeight = 54;
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
			style={{
				cursor: "pointer",
			}}
			onRow={(record) => ({
				onClick: () => onRowClick(record),
			})}
		/>
	);
};

export default OrdersTable;
