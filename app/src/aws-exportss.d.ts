declare const awsconfig: {
	Auth: {
		region: string;
		userPoolId: string;
		userPoolWebClientId: string;
		identityPoolId?: string;
	};
};

export default awsconfig;
