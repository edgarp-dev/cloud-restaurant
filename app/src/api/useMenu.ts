import { useQuery } from "@tanstack/react-query";
import ApliClient from "./ApiClient";
import { MenuApiResponse } from "./types";
import Menu from "../core/MenuEntry";
import { ordersApiUrl } from "./Urls";

const useMenu = () => {
	return useQuery({
		queryKey: ["menu-items"],
		queryFn: async (): Promise<Menu[]> => {
			const apiClient = await ApliClient.getInstance(ordersApiUrl);

			const menuApiResponse = await apiClient.get<MenuApiResponse>("/menu");

			if (!menuApiResponse) return [];

			const menuItems: Menu[] = [];

			for (const { Id, ImageSrc, Name, Price } of menuApiResponse) {
				const menuItem = new Menu();

				menuItem.id = Id;
				menuItem.imageSrc = ImageSrc;
				menuItem.name = Name;
				menuItem.price = parseInt(Price);

				menuItems.push(menuItem);
			}

			return menuItems;
		},
	});
};

export default useMenu;
