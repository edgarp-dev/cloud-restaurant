import React, { useState } from "react";
import { Flex, Layout } from "antd";
import { useMenu } from "../../api";
import Empty from "../ui/empty";
import MenuItem from "./MenuItem";
import MenuEntry from "../../core/MenuEntry";
import OrderModal from "./OrderModal";

const { Content } = Layout;

type State = {
	menuItem: MenuEntry | undefined;
	showModal: boolean;
};

const Menu = () => {
	const { status, data } = useMenu();
	const [orderProps, setOrderProps] = useState<State>({
		menuItem: undefined,
		showModal: false,
	});

	if (status === "pending") {
		return <p>Loading...</p>;
	}

	if (status === "error") {
		return <p>Error :(</p>;
	}

	if (data.length === 0) {
		return <Empty description="No menu" />;
	}

	const onClick = (menuItem: MenuEntry) => {
		setOrderProps({ showModal: true, menuItem });
	};

	const onClosePizzaOrder = () => {
		setOrderProps({
			menuItem: undefined,
			showModal: false,
		});
	};

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
					<MenuItem key={menu.id} menu={menu} onClick={onClick} />
				))}
			</Flex>
			<OrderModal orderProps={orderProps} onClose={onClosePizzaOrder} />
		</Content>
	);
};

export default Menu;
