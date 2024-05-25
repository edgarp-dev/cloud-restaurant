import React from "react";
import { Menu, Button } from "antd";

type Props = {
	text: string;
	onClick: any;
};

const NavbarMenuItem = ({ text, onClick }: Props) => {
	return <a onClick={onClick}>{text}</a>;
};

export default NavbarMenuItem;
