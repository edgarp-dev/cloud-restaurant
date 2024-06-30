import { fetchAuthSession } from "@aws-amplify/auth";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

export default class ApliClient {
	private static instance: ApliClient;

	private readonly accessToken: string | undefined;

	private readonly baseUrl: string;

	constructor(accessToken: string | undefined, baseUrl: string) {
		this.accessToken = accessToken;
		this.baseUrl = baseUrl;
	}

	public async get<T>(endpoint: string): Promise<T | undefined> {
		try {
			const config: AxiosRequestConfig = {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.accessToken}`,
				},
			};

			const response = await axios.get(`${this.baseUrl}${endpoint}`, config);

			return response.data;
		} catch (error) {
			console.error(error);
		}
	}

	public async post<T>(endpoint: string, data: any): Promise<T | undefined> {
		try {
			const config: AxiosRequestConfig = {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.accessToken}`,
				},
			};

			const response = await axios.post(`${this.baseUrl}${endpoint}`, data, config);

			return response.data;
		} catch (error) {
			console.error(error);
		}
	}

	public static async getInstance(baseUrl: string): Promise<ApliClient> {
		const userSession = await fetchAuthSession();
		const accessToken = userSession.tokens?.idToken;

		return new ApliClient(accessToken?.toString(), baseUrl);
	}
}
