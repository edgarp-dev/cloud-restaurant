import React from "react";
import { Flex, Layout, Card } from "antd";
import { useMenu } from "../../api";
import Empty from "../ui/empty";
import MenuItem from "./MenuItem";

const { Content } = Layout;

const Menu = () => {
	const { status, data } = useMenu();

	if (status === "pending") {
		return <p>Loading...</p>;
	}

	if (status === "error") {
		return <p>Error :(</p>;
	}

	if (data.length === 0) {
		return <Empty description="No menu" />;
	}

	return (
		<Content
			style={{
				height: "calc(100% - 60px)",
				overflow: "auto",
				padding: "30px",
			}}
		>
			<Flex wrap gap="large">
				{data.map((menu) => (
					<MenuItem key={menu.id} menu={menu} />
				))}
			</Flex>
		</Content>
	);
};

export default Menu;
