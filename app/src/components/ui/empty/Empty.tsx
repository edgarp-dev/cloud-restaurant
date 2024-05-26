import React from "react";
import { Empty as AntEmpty } from "antd";

type Props = {
	description: string;
};

const Empty = ({ description }: Props) => {
	return (
		<AntEmpty
			image={AntEmpty.PRESENTED_IMAGE_SIMPLE}
			imageStyle={{ height: 60 }}
			description={<span>{description}</span>}
		/>
	);
};

export default Empty;
