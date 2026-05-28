export function compareArrayElements<T>(arr1: ReadonlyArray<T>, arr2: ReadonlyArray<T>): boolean {
	if (arr1.length !== arr2.length) {
		return false;
	}
	for (let i = 0; i < arr1.length; i++) {
		const include = arr2.includes(arr1[i]);
		if (!include) {
			return false;
		}
	}
	return true;
}
