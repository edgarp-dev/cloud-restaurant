import React from "react";
import Menu from "../../core/MenuEntry";
import { Card, Image } from "antd";

const { Meta } = Card;

type Props = {
	menu: Menu;
};

const MenuItem = ({ menu }: Props) => {
	const { id, imageSrc, name, price } = menu;
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
		>
			<Meta title={name} description={price} />
		</Card>
	);
};

export default MenuItem;
