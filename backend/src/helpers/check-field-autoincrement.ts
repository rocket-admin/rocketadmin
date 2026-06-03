export function checkFieldAutoincrement(defaultValue: string | null, extra: string | null = null): boolean {
	let result = false;
	if (
		defaultValue?.toLowerCase().includes('nextval') ||
		defaultValue?.toLowerCase().includes('generate') ||
		defaultValue?.toLowerCase().includes('autoincrement') ||
		defaultValue?.toLowerCase().includes('auto_increment') ||
		extra?.toLowerCase().includes('auto_increment') ||
		extra?.toLowerCase().includes('autoincrement')
	) {
		result = true;
	}
	return result;
}
