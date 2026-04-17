export type BinaryBufferJson = { type: 'Buffer'; data: number[] };

export function parseBinaryValue(value: unknown): number[] {
	if (value == null || value === '') return [];
	if (value instanceof Uint8Array) return Array.from(value);
	if (typeof value === 'string') return stringToBytes(value);
	if (typeof value === 'object') {
		const data = (value as { data?: unknown }).data;
		if (Array.isArray(data)) return (data as number[]).slice();
	}
	return [];
}

export function stringToBytes(str: string): number[] {
	const bytes: number[] = [];
	for (let i = 0; i < str.length; i++) {
		bytes.push(str.charCodeAt(i) & 0xff);
	}
	return bytes;
}

export function hexStringToBytes(hex: string): number[] {
	if (!hex) return [];
	const normalized = hex.length % 2 === 0 ? hex : `0${hex}`;
	const bytes: number[] = [];
	for (let i = 0; i < normalized.length; i += 2) {
		const byte = parseInt(normalized.substring(i, i + 2), 16);
		if (Number.isNaN(byte)) return [];
		bytes.push(byte);
	}
	return bytes;
}

export function bytesToHex(bytes: number[]): string {
	return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function toBufferJson(bytes: number[]): BinaryBufferJson {
	return { type: 'Buffer', data: bytes };
}
