export function enumToString<E extends Record<string, string | number>>(en: E): string {
	return Object.values(en).join(', ');
}
