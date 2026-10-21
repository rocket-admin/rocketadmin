import { describe, expect, it } from 'vitest';
import { emailErrors, emailValidation } from './email.validator';

describe('email validator', () => {
	it('passes empty values and valid emails', () => {
		for (const value of ['', null, 'john@example.com', 'a.b+tag@sub.domain.io', '"quoted"@example.com'])
			expect(emailErrors(value)).toBeNull();
	});

	it('rejects values without an email', () => {
		for (const value of ['john', 'john@', '@example.com', 'john@example'])
			expect(emailErrors(value)).toEqual({ isInvalidEmail: true });
	});

	it('is unanchored like the Angular regex', () => {
		expect(emailErrors('Name <john@example.com>')).toBeNull();
	});

	it('works as a rule', () => {
		const rule = emailValidation();
		expect(rule('john@example.com')).toBe(true);
		expect(rule('john')).toBe('Invalid email format.');
	});
});
