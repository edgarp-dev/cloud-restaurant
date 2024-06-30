import { UseMutationOptions, useMutation } from "@tanstack/react-query";
import { fetchAuthSession } from "@aws-amplify/auth";
import ApliClient from "./ApiClient";
import { ordersApiUrl } from "./Urls";
import { PostOrderApiResponse } from "./types";

interface NewOrder {
	menuId: string;
	quantity: number;
	price: number;
}

const postNewOrder = async (newOrder: NewOrder) => {
	const apiClient = await ApliClient.getInstance(ordersApiUrl);

	const userSession = await fetchAuthSession();
	const { userSub } = userSession;

	const response = await apiClient.post<PostOrderApiResponse>("/orders", {
		...newOrder,
		userId: userSub,
	});
	return response;
};

const useCreateOrder = (
	options?: UseMutationOptions<
		PostOrderApiResponse | undefined,
		Error,
		NewOrder
	>
) => {
	return useMutation({
		mutationFn: postNewOrder,
		...options,
	});
};

export default useCreateOrder;
