import React from "react";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

const Loader: React.FC = () => (
	<div
		style={{
			display: "flex",
			justifyContent: "center",
			alignItems: "center",
			height: "100vh",
		}}
	>
		<Spin indicator={<LoadingOutlined spin />} size="large" />
	</div>
);

export default Loader;
