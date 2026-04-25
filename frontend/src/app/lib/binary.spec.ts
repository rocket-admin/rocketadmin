import {
	base64StringToBytes,
	bytesToAscii,
	bytesToBase64,
	bytesToEncoded,
	bytesToHex,
	encodedToBytes,
	hexStringToBytes,
	isBinaryEncoding,
	parseBinaryValue,
	stringToBytes,
	toBufferJson,
} from './binary';

describe('binary helpers', () => {
	describe('parseBinaryValue', () => {
		it('returns empty for null/undefined/empty', () => {
			expect(parseBinaryValue(null)).toEqual([]);
			expect(parseBinaryValue(undefined)).toEqual([]);
			expect(parseBinaryValue('')).toEqual([]);
		});

		it('parses a string as char-code-per-byte', () => {
			expect(parseBinaryValue('Hello')).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
		});

		it('truncates char codes above 0xff to a byte', () => {
			expect(parseBinaryValue('ÿĀ')).toEqual([0xff, 0x00]);
		});

		it('extracts data from a Buffer-JSON value', () => {
			expect(parseBinaryValue({ type: 'Buffer', data: [0x48, 0x65] })).toEqual([0x48, 0x65]);
		});

		it('extracts data from a Uint8Array', () => {
			expect(parseBinaryValue(new Uint8Array([1, 2, 3]))).toEqual([1, 2, 3]);
		});
	});

	describe('stringToBytes', () => {
		it('maps each char to its 8-bit code', () => {
			expect(stringToBytes('Hi')).toEqual([0x48, 0x69]);
		});
	});

	describe('hexStringToBytes', () => {
		it('parses even-length hex', () => {
			expect(hexStringToBytes('48656c6c6f')).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
		});

		it('left-pads odd-length hex', () => {
			expect(hexStringToBytes('abc')).toEqual([0x0a, 0xbc]);
		});

		it('returns empty for malformed hex', () => {
			expect(hexStringToBytes('zz')).toEqual([]);
		});

		it('returns empty for empty input', () => {
			expect(hexStringToBytes('')).toEqual([]);
		});
	});

	describe('bytesToHex', () => {
		it('formats bytes with zero-padded lowercase hex', () => {
			expect(bytesToHex([0x01, 0xab, 0x00])).toBe('01ab00');
		});

		it('returns empty string for empty array', () => {
			expect(bytesToHex([])).toBe('');
		});
	});

	describe('bytesToBase64 / base64StringToBytes', () => {
		it('round-trips ASCII "Hello" as SGVsbG8=', () => {
			const bytes = [0x48, 0x65, 0x6c, 0x6c, 0x6f];
			expect(bytesToBase64(bytes)).toBe('SGVsbG8=');
			expect(base64StringToBytes('SGVsbG8=')).toEqual(bytes);
		});

		it('encodes empty bytes to empty string', () => {
			expect(bytesToBase64([])).toBe('');
			expect(base64StringToBytes('')).toEqual([]);
		});

		it('handles arbitrary binary bytes including 0x00 and 0xff', () => {
			const bytes = [0x00, 0x10, 0x80, 0xff];
			const encoded = bytesToBase64(bytes);
			expect(base64StringToBytes(encoded)).toEqual(bytes);
		});

		it('returns null for invalid base64', () => {
			expect(base64StringToBytes('not base64!')).toBeNull();
			expect(base64StringToBytes('SGVsbG8')).toBeNull(); // missing padding
		});

		it('encodes a long payload via chunked path', () => {
			const bytes = new Array(10000).fill(0).map((_, i) => i & 0xff);
			const encoded = bytesToBase64(bytes);
			expect(base64StringToBytes(encoded)).toEqual(bytes);
		});
	});

	describe('bytesToAscii', () => {
		it('renders printable bytes as-is', () => {
			expect(bytesToAscii([0x48, 0x69, 0x21])).toBe('Hi!');
		});

		it('replaces non-printable bytes with a dot', () => {
			expect(bytesToAscii([0x00, 0x48, 0x1f, 0x7f, 0xff, 0x80])).toBe('.H....');
		});

		it('keeps tab, LF, CR as-is', () => {
			expect(bytesToAscii([0x09, 0x0a, 0x0d, 0x41])).toBe('\t\n\rA');
		});
	});

	describe('bytesToEncoded / encodedToBytes', () => {
		it('hex round-trip', () => {
			const bytes = [0x01, 0xab, 0x00];
			const enc = bytesToEncoded(bytes, 'hex');
			expect(enc).toBe('01ab00');
			expect(encodedToBytes(enc, 'hex')).toEqual(bytes);
		});

		it('base64 round-trip', () => {
			const bytes = [0x48, 0x65, 0x6c, 0x6c, 0x6f];
			const enc = bytesToEncoded(bytes, 'base64');
			expect(enc).toBe('SGVsbG8=');
			expect(encodedToBytes(enc, 'base64')).toEqual(bytes);
		});

		it('ascii round-trip for printable input', () => {
			const bytes = [0x48, 0x69];
			expect(bytesToEncoded(bytes, 'ascii')).toBe('Hi');
			expect(encodedToBytes('Hi', 'ascii')).toEqual(bytes);
		});

		it('encodedToBytes returns null for invalid hex', () => {
			expect(encodedToBytes('zz', 'hex')).toBeNull();
			expect(encodedToBytes('abc', 'hex')).toBeNull();
		});

		it('encodedToBytes returns null for invalid base64', () => {
			expect(encodedToBytes('!!!', 'base64')).toBeNull();
		});

		it('encodedToBytes always accepts ascii', () => {
			expect(encodedToBytes('ÿx', 'ascii')).toEqual([0xff, 0x78]);
		});

		it('encodedToBytes returns empty array for empty input in any encoding', () => {
			expect(encodedToBytes('', 'hex')).toEqual([]);
			expect(encodedToBytes('', 'base64')).toEqual([]);
			expect(encodedToBytes('', 'ascii')).toEqual([]);
		});
	});

	describe('isBinaryEncoding', () => {
		it('accepts valid values', () => {
			expect(isBinaryEncoding('hex')).toBe(true);
			expect(isBinaryEncoding('base64')).toBe(true);
			expect(isBinaryEncoding('ascii')).toBe(true);
		});

		it('rejects unknown values', () => {
			expect(isBinaryEncoding('utf8')).toBe(false);
			expect(isBinaryEncoding(undefined)).toBe(false);
			expect(isBinaryEncoding(null)).toBe(false);
			expect(isBinaryEncoding(123)).toBe(false);
		});
	});

	describe('toBufferJson', () => {
		it('wraps bytes in Buffer-JSON shape', () => {
			expect(toBufferJson([1, 2])).toEqual({ type: 'Buffer', data: [1, 2] });
		});
	});
});
