export function formatDateToString(date: Date) {
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
