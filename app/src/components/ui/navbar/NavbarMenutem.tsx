import React from "react";

type Props = {
	text: string;
	onClick: any;
};

const NavbarMenuItem = ({ text, onClick }: Props) => {
	return <a onClick={onClick}>{text}</a>;
};

export default NavbarMenuItem;
