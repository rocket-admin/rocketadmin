export function isObjectEmpty(obj: object | null | undefined): boolean {
	if (!obj) {
		return true;
	}
	for (const _ in obj) {
		return false;
	}
	return true;
}
