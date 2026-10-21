import { describe, expect, it } from 'vitest';
import { passwordErrors, passwordValidation } from './password.validator';

describe('password validator', () => {
	it('passes empty values and strong passwords', () => {
		for (const value of ['', null, undefined, 'Passw0rd', 'aB3xxxxxxxxx']) expect(passwordErrors(value)).toBeNull();
	});

	it('reports every requirement, true meaning met (the Angular shape)', () => {
		expect(passwordErrors('abc')).toEqual({
			oneUpperCaseLetter: false,
			oneNumber: false,
			oneLowerCaseLetter: true,
			min8: false,
		});
		expect(passwordErrors('PASSWORD1')).toEqual({
			oneUpperCaseLetter: true,
			oneNumber: true,
			oneLowerCaseLetter: false,
			min8: true,
		});
	});

	it('works as a rule listing the unmet requirements', () => {
		const rule = passwordValidation();
		expect(rule('Passw0rd')).toBe(true);
		expect(rule('abc')).toBe('Password must contain: an upper case letter, a number, at least 8 characters');
		expect(rule('PASSWORD1')).toBe('Password must contain: a lower case letter');
	});
});
