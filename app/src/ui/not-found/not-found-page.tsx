import React from "react";
import { Result } from "antd";

const NotFoundPage: React.FC = () => {
	return (
		<Result
			status="404"
			title="404"
			subTitle="Sorry, the page you visited does not exist."
		/>
	);
};

export default NotFoundPage;
