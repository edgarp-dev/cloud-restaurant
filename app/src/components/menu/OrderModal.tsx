import React, { useState } from "react";
import { Modal, Image, Button } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import Menu from "../../core/MenuEntry";
import { useCreateOrder } from "../../api/";

type Props = {
	orderProps: { menuItem: Menu | undefined; showModal: boolean };
	onClose: () => void;
};

const OrderModal = ({ orderProps, onClose }: Props) => {
	const [amount, setAmount] = useState(1);
	const [showLoader, setShowLoader] = useState(false);
	const [showOrderSuccess, setShowOrderSuccess] = useState(false);

	const resetModalState = () => {
		setAmount(1);
		setShowLoader(false);
	};

	const mutation = useCreateOrder({
		onSuccess: () => {
			setShowOrderSuccess(true);
		},
		onError: (error) => {
			setShowLoader(false);
			console.error("Error creating order:", error);
		},
	});

	const { menuItem, showModal } = orderProps;

	if (!menuItem) return null;

	const { id, name, imageSrc, price } = menuItem;

	const handleOk = async () => {
		setShowLoader(true);

		try {
			const newOrder = {
				menuId: id,
				quantity: amount,
				price,
			};
			await mutation.mutateAsync(newOrder);
		} catch (error) {
			console.error(error);
		}
	};

	const handleOnClose = () => {
		setShowOrderSuccess(false);
		resetModalState();
		onClose();
	};

	const increaseCount = () => {
		setAmount(amount + 1);
	};

	const decreaseCount = () => {
		setAmount(amount > 0 ? amount - 1 : 0);
	};

	const renderSuccessMessage = () => {
		return (
			<div style={{ textAlign: "center", color: "green", fontSize: "18px" }}>
				<CheckCircleOutlined style={{ fontSize: "32px", marginBottom: 20 }} />
				<p>Order successfully created</p>
				<Button type="primary" onClick={handleOnClose}>
					Close
				</Button>
			</div>
		);
	};

	const renderOrdeContent = () => {
		return (
			<div style={{ textAlign: "center" }}>
				<Image
					height={300}
					width={280}
					preview={false}
					alt={name}
					src={imageSrc}
				/>
				<h3>{name}</h3>
				<p>{`$${price}`}</p>
				<div
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						marginTop: 20,
					}}
				>
					<Button onClick={decreaseCount}>-</Button>
					<span style={{ margin: "0 10px", fontSize: "16px" }}>{amount}</span>
					<Button onClick={increaseCount}>+</Button>
				</div>
				<div style={{ textAlign: "right", marginTop: 20 }}>
					<span style={{ fontSize: "16px" }}>Total: {price * amount}</span>
				</div>
				<div style={{ marginTop: 20 }}>
					<Button
						style={{ marginRight: 8 }}
						onClick={handleOnClose}
						loading={showLoader}
					>
						Cancel
					</Button>
					<Button type="primary" onClick={handleOk} loading={showLoader}>
						Confirm
					</Button>
				</div>
			</div>
		);
	};

	return (
		<Modal
			title="Order Pizza"
			open={showModal}
			okText="Order pizza"
			confirmLoading={showLoader}
			footer={null}
			closable={false}
		>
			{showOrderSuccess ? renderSuccessMessage() : renderOrdeContent()}
		</Modal>
	);
};

export default OrderModal;
