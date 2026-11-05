import { describe, expect, it } from 'vitest';
import { hexErrors, hexValidation } from './hex.validator';

describe('hex validator', () => {
	it('passes empty values and even-length hex', () => {
		for (const value of ['', null, '48656c6c6f21', 'ABCDEF', '+0ff']) expect(hexErrors(value)).toBeNull();
	});

	it('rejects odd length or non-hex characters', () => {
		for (const value of ['abc', 'zz', '0x12', '12 34']) expect(hexErrors(value)).toEqual({ isInvalidHex: true });
	});

	it('works as a rule', () => {
		const rule = hexValidation();
		expect(rule('ff')).toBe(true);
		expect(rule('f')).toBe('Invalid hex.');
	});
});
