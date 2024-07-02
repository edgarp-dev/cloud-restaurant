type MenuApiItem = {
	Id: string;
	ImageSrc: string;
	Name: string;
	Price: string;
};
export type MenuApiResponse = MenuApiItem[];

export type PostOrderApiResponse = { [key: string]: string };

type OrderApiItem = {
	id: string;
	status: string;
	date: string;
}

export type OrderApiResponse = OrderApiItem[];
