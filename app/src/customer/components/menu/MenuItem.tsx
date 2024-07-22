import React from "react";
import Menu from "../../../core/MenuEntry";
import { Card, Image } from "antd";

const { Meta } = Card;

type Props = {
	menu: Menu;
	onClick: (menuItem: Menu) => void;
};

const MenuItem = ({ menu, onClick }: Props) => {
	const { id, imageSrc, name, price } = menu;

	const onCardClick = () => onClick(menu);

	return (
		<Card
			key={id}
			hoverable
			style={{ width: 280 }}
			cover={
				<Image
					height={300}
					width={280}
					preview={false}
					alt={name}
					src={imageSrc}
				/>
			}
			onClick={onCardClick}
		>
			<Meta title={name} description={`$${price}`} />
		</Card>
	);
};

export default MenuItem;
