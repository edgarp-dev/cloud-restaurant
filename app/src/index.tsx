import "./index.css";
import "antd/dist/reset.css";
import "@aws-amplify/ui-react/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import awsExports from "./aws-exports";

Amplify.configure(awsExports);
const queryClient = new QueryClient();

const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement
);
root.render(
	<React.StrictMode>
		<Authenticator>
			<QueryClientProvider client={queryClient}>
				<App />
			</QueryClientProvider>
		</Authenticator>
	</React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
