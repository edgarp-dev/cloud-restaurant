import React from "react";
import { Layout, Dropdown, Avatar, MenuProps } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { Authenticator } from "@aws-amplify/ui-react";
import NavbarMenuItem from "./NavbarMenutem";

const { Header } = Layout;

type Props = {
	links: { title: string; path: string }[];
};

const Navbar = ({ links }: Props) => {
	const menuItems: MenuProps["items"] = [
		{
			key: "1",
			label: (
				<Authenticator>
					{({ signOut }) => <NavbarMenuItem text="Logout" onClick={signOut} />}
				</Authenticator>
			),
		},
	];

	return (
		<Layout>
			<Header
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					height: "60px",
				}}
			>
				<div
					style={{
						fontSize: "24px",
						fontWeight: "bold",
						color: "#fff",
					}}
				>
					<span>cloud restaurant</span>
					{links.map((link, idx) => (
						<Link
							key={link.title}
							to={link.path}
							style={{ marginLeft: idx !== 0 ? "10px" : "20px", color: "#fff" }}
						>
							{link.title}
						</Link>
					))}
				</div>
				<Dropdown menu={{ items: menuItems }} placement="bottomRight">
					<Avatar icon={<UserOutlined />} style={{ cursor: "pointer" }} />
				</Dropdown>
			</Header>
		</Layout>
	);
};

export default Navbar;
