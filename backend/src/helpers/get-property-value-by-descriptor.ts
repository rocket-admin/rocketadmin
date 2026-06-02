export function getPropertyValueByDescriptor<T extends object>(obj: T, propName: string): unknown {
	return Object.getOwnPropertyDescriptor(obj, propName)?.value;
}
