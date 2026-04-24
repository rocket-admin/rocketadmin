export type BinaryBufferJson = { type: 'Buffer'; data: number[] };

export type BinaryEncoding = 'hex' | 'base64' | 'ascii';

export const BINARY_ENCODINGS = ['hex', 'base64', 'ascii'] as const;

export function isBinaryEncoding(value: unknown): value is BinaryEncoding {
	return value === 'hex' || value === 'base64' || value === 'ascii';
}

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

const BASE64_CHUNK = 0x2000;

export function bytesToBase64(bytes: number[]): string {
	if (bytes.length === 0) return '';
	let binary = '';
	for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
		const chunk = bytes.slice(i, i + BASE64_CHUNK);
		binary += String.fromCharCode.apply(null, chunk);
	}
	return btoa(binary);
}

const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;

export function base64StringToBytes(str: string): number[] | null {
	if (!str) return [];
	if (str.length % 4 !== 0 || !BASE64_REGEX.test(str)) return null;
	try {
		const binary = atob(str);
		const bytes: number[] = [];
		for (let i = 0; i < binary.length; i++) {
			bytes.push(binary.charCodeAt(i) & 0xff);
		}
		return bytes;
	} catch {
		return null;
	}
}

// Replacement character for non-printable ASCII bytes in display/encode.
const ASCII_REPLACEMENT = '.';

function isPrintableAscii(byte: number): boolean {
	if (byte === 0x09 || byte === 0x0a || byte === 0x0d) return true;
	return byte >= 0x20 && byte !== 0x7f && byte <= 0x7e;
}

export function bytesToAscii(bytes: number[]): string {
	let out = '';
	for (const b of bytes) {
		out += isPrintableAscii(b) ? String.fromCharCode(b) : ASCII_REPLACEMENT;
	}
	return out;
}

export function bytesToEncoded(bytes: number[], encoding: BinaryEncoding): string {
	switch (encoding) {
		case 'hex':
			return bytesToHex(bytes);
		case 'base64':
			return bytesToBase64(bytes);
		case 'ascii':
			return bytesToAscii(bytes);
	}
}

const HEX_REGEX = /^[0-9A-Fa-f]*$/;

export function encodedToBytes(str: string, encoding: BinaryEncoding): number[] | null {
	if (!str) return [];
	switch (encoding) {
		case 'hex':
			if (!HEX_REGEX.test(str) || str.length % 2 !== 0) return null;
			return hexStringToBytes(str);
		case 'base64':
			return base64StringToBytes(str);
		case 'ascii':
			return stringToBytes(str);
	}
}

export function toBufferJson(bytes: number[]): BinaryBufferJson {
	return { type: 'Buffer', data: bytes };
}
