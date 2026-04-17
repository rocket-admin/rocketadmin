import { Constants } from './constants/constants.js';

export function binaryToHex(
	binaryData: string | Uint8Array | { [key: string]: number } | { type: string; data: number[] },
): string {
	let buffer: Buffer;
	if (binaryData instanceof Uint8Array) {
		buffer = Buffer.from(binaryData);
	} else if (typeof binaryData === 'object') {
		const data =
			binaryData.type === 'Buffer' && Array.isArray(binaryData.data) ? binaryData.data : Object.values(binaryData);
		buffer = Buffer.from(data);
	} else {
		buffer = Buffer.from(binaryData, 'binary');
	}
	return buffer.toString('hex');
}

export function hexToBinary(hexSource: string): Buffer {
	return Buffer.from(hexSource, 'hex');
}

export function toBinaryBuffer(value: unknown): Buffer {
	if (Buffer.isBuffer(value)) return value;
	if (value instanceof Uint8Array) return Buffer.from(value);
	if (typeof value === 'string') return hexToBinary(value);
	if (value && typeof value === 'object') {
		const v = value as { type?: string; data?: unknown };
		if (v.type === 'Buffer' && Array.isArray(v.data)) return Buffer.from(v.data as number[]);
		if (Array.isArray(v.data)) return Buffer.from(v.data as number[]);
		return Buffer.from(Object.values(value as Record<string, number>));
	}
	return hexToBinary(String(value));
}

export function isBinary(type: string): boolean {
	return Constants.BINARY_DATATYPES.includes(type.toLowerCase());
}
