import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const awsRegion = "us-east-1";
const env = "dev";
const tableName = `cloud-restaurant-menu-db-${env}`;

const client = new DynamoDBClient({ region: awsRegion });

const chicagoPizzaPutItemCommand = new PutItemCommand({
	TableName: tableName,
	Item: {
		Id: {
			S: "357c1d01-f2e6-4d3f-9010-49c17a0f0368",
		},
		Name: {
			S: "Chicago Pizza",
		},
		Price: {
			S: "10",
		},
		ImageSrc: {
			S: "https://live.staticflickr.com/3047/2596599804_2326cb03ac_c.jpg",
		},
	},
});

const pepperoniPizzaPutItemCommand = new PutItemCommand({
	TableName: tableName,
	Item: {
		Id: {
			S: "bef5932f-3afc-4b1a-a71b-5445dab9595e",
		},
		Name: {
			S: "Pepperoni Pizza",
		},
		Price: {
			S: "5",
		},
		ImageSrc: {
			S: "https://live.staticflickr.com/4154/5060870296_f2135fcc8e_c.jpg",
		},
	},
});

const mexicanPizzaPutItemCommand = new PutItemCommand({
	TableName: tableName,
	Item: {
		Id: {
			S: "4b2e95d9-f98a-4a44-997d-640f6e280f4a",
		},
		Name: {
			S: "Mexican Pizza",
		},
		Price: {
			S: "8",
		},
		ImageSrc: {
			S: "https://live.staticflickr.com/4017/4582348989_2b0e222027_c.jpg",
		},
	},
});

const run = async () => {
	try {
		await client.send(chicagoPizzaPutItemCommand);
		await client.send(pepperoniPizzaPutItemCommand);
		await client.send(mexicanPizzaPutItemCommand);

		console.log("Items inserted successfully");
	} catch (err) {
		console.error("Error inserting item:", err);
	}
};

run();
