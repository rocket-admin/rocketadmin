import { bytesToHex, hexStringToBytes, parseBinaryValue, stringToBytes, toBufferJson } from './binary';

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
			expect(parseBinaryValue('\u00ff\u0100')).toEqual([0xff, 0x00]);
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

	describe('toBufferJson', () => {
		it('wraps bytes in Buffer-JSON shape', () => {
			expect(toBufferJson([1, 2])).toEqual({ type: 'Buffer', data: [1, 2] });
		});
	});
});
