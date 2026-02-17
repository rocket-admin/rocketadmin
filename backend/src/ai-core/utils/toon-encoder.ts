import { encode as toonEncode } from '@toon-format/toon';

export function encodeToToon(data: unknown): string {
	return toonEncode(data);
}

export function encodeError(error: { error: string }): string {
	return JSON.stringify(error);
}
