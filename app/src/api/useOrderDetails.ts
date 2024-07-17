import { useQuery } from "@tanstack/react-query";
import { fetchAuthSession } from "@aws-amplify/auth";
import OrderDetails from "../core/OrderDetails";
import ApliClient from "./ApiClient";
import { OrderDetailsApiResponse } from "./types";
import { ordersApiUrl } from "./Urls";

const useOrderDetails = (orderId: string) => {
	return useQuery({
		queryKey: [`order-details-${orderId}`],
		queryFn: async (): Promise<OrderDetails | undefined> => {
			const apiClient = await ApliClient.getInstance(ordersApiUrl);
			const userSession = await fetchAuthSession();
			const { userSub: userId } = userSession;

			const menuApiResponse = await apiClient.get<OrderDetailsApiResponse>(
				`/orders/${userId}/${orderId}`
			);

			if (!menuApiResponse) return undefined;

			const { orderDate, quantity, status, amount, menuDetails } =
				menuApiResponse;
			const { imageSrc, name, price } = menuDetails;
			const orderDetails = new OrderDetails(
				orderDate,
				quantity,
				status,
				amount,
				imageSrc,
				name,
				price
			);

			return orderDetails;
		},
	});
};

export default useOrderDetails;
