import React from "react";

type Props = {
	text: string;
	key: string;
	onClick: any;
};

const NavbarMenuItem = ({ text, key, onClick }: Props) => {
	return (
		<a key={key} onClick={onClick}>
			{text}
		</a>
	);
};

export default NavbarMenuItem;
