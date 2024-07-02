import { useQuery } from "@tanstack/react-query";
import Order from "../core/Order";
import ApliClient from "./ApiClient";
import { ordersApiUrl } from "./Urls";
import { fetchAuthSession } from "@aws-amplify/auth";
import { OrderApiResponse } from "./types";

function formatDateToString(date: Date) {
	const daysOfWeek = [
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
	];
	const months = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];

	const dayOfWeek = daysOfWeek[date.getDay()];
	const dayOfMonth = date.getDate();
	const month = months[date.getMonth()];
	const hours = date.getHours();
	const minutes = date.getMinutes();

	const formatTime = (hours: number, minutes: number) => {
		const hour = hours % 12 || 12; // Convert to 12-hour format
		const minute = minutes < 10 ? `0${minutes}` : minutes;
		const ampm = hours >= 12 ? "PM" : "AM";
		return `${hour}:${minute} ${ampm}`;
	};

	return `${dayOfWeek} ${month} ${dayOfMonth}, ${formatTime(hours, minutes)}`;
}

const formatStatus = (status: string): string => {
	switch (status) {
		case "ORDER_RECEIVED":
			return "Order recieved";
		case "ORDER_WAITING_PICK_UP":
			return "Order waiting for pick up"
		default:
			return ""
	}
};

const useOrdersByUser = () => {
	return useQuery({
		queryKey: ["orders-by-user"],
		queryFn: async (): Promise<Order[]> => {
			const apiClient = await ApliClient.getInstance(ordersApiUrl);
			const userSession = await fetchAuthSession();
			const { userSub } = userSession;

			const ordersApiResponse = await apiClient.get<OrderApiResponse>(
				`/orders/${userSub}`
			);

			if (!ordersApiResponse) return [];

			const orders: Order[] = [];

			for (const { id, status, date } of ordersApiResponse) {
				orders.push({
					id,
					status: formatStatus(status),
					date: formatDateToString(new Date(date)),
				});
			}

			return orders;
		},
	});
};

export default useOrdersByUser;
