import { formatDateToString } from "./DateUtils";

export default class OrdereDetails {
	private _date: string;

	private _quantity: string;

	private _status: string;

	private _amount: string;

	private _menuImage: string;

	private _menuName: string;

	private _menuPrice: string;

	constructor(
		date: string,
		quantity: string,
		status: string,
		amount: string,
		menuImage: string,
		menuName: string,
		menuPrice: string
	) {
		this._date = date;
		this._quantity = quantity;
		this._status = status;
		this._amount = amount;
		this._menuImage = menuImage;
		this._menuName = menuName;
		this._menuPrice = menuPrice;
	}

	public get date(): string {
		return formatDateToString(new Date(this._date));
	}

	public get quantity(): string {
		return this._quantity;
	}

	public get status(): string {
		switch (this._status) {
			case "ORDER_RECEIVED":
				return "Order recieved";
			case "ORDER_WAITING_PICK_UP":
				return "Order waiting for pick up";
			default:
				return "";
		}
	}

	public get amount(): string {
		return `$${this._amount}`;
	}

	public get menuImage(): string {
		return this._menuImage;
	}

	public get menuName(): string {
		return this._menuName;
	}

	public get menuPrice(): string {
		return `$${this._menuPrice}`;
	}
}
