import React from "react";
import { Layout, Dropdown, Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { ItemType } from "antd/es/menu/interface";

const { Header } = Layout;

type Props = {
	menuItems: ItemType[];
};

const Navbar = ({ menuItems }: Props) => {
	return (
		<Layout className="layout">
			<Header
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<div
					className="logo"
					style={{
						fontSize: "24px",
						fontWeight: "bold",
                        color: "#fff"
					}}
				>
					cloud restaurant
				</div>
				<Dropdown menu={{ items: menuItems }} placement="bottomRight">
					<Avatar icon={<UserOutlined />} style={{ cursor: "pointer" }} />
				</Dropdown>
			</Header>
		</Layout>
	);
};

export default Navbar;
