import { describe, expect, it } from 'vitest';
import { base64Errors, base64Validation } from './base64.validator';

describe('base64 validator', () => {
	it('passes empty values and padded base64', () => {
		for (const value of ['', null, undefined, 'SGVsbG8=', 'SGVsbA==', 'YWJj']) expect(base64Errors(value)).toBeNull();
	});

	it('rejects wrong length or characters', () => {
		for (const value of ['SGVsbG8', 'SGV$bG8=', 'ab=c', '====='])
			expect(base64Errors(value)).toEqual({ isInvalidBase64: true });
	});

	it('works as a rule', () => {
		const rule = base64Validation();
		expect(rule('YWJj')).toBe(true);
		expect(rule('abc')).toBe('Invalid base64.');
	});
});
