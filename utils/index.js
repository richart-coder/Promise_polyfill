export const rawType = (value) =>
	Object.prototype.toString.call(value).slice(8, -1);

