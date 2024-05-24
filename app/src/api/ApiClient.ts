import { fetchAuthSession } from "@aws-amplify/auth";
import axios, { AxiosRequestConfig } from "axios";

export default class ApliClient {
	private static instance: ApliClient;

	private readonly baseUrl =
		"https://c4elgsi3nf.execute-api.us-east-1.amazonaws.com/dev";

	private readonly accessToken: string | undefined;

	constructor(accessToken: string | undefined) {
		this.accessToken = accessToken;
	}

	public async get(endpoint: string): Promise<void> {
		try {
			const config: AxiosRequestConfig = {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.accessToken}`,
				},
			};

			const response = await axios.get(`${this.baseUrl}${endpoint}`, config);
			console.log(response);
		} catch (error) {
			console.error(error);
		}
	}

	public static async getInstance(): Promise<ApliClient> {
		const userSession = await fetchAuthSession();
		const accessToken = userSession.tokens?.idToken;

		return new ApliClient(accessToken?.toString());
	}
}
