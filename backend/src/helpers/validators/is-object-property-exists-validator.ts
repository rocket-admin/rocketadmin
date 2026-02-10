export function isObjectPropertyExists(obj: unknown, property: string): boolean {
	if (!obj || typeof obj !== 'object') {
		return false;
	}
	return Object.hasOwn(obj, property);
}
