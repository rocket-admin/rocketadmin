import { afterEach, describe, expect, it, vi } from 'vitest';
import { textErrors, textValidation, textValidationMessage } from './text.validator';

describe('text validator', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('passes empty values and a missing validate type', () => {
		expect(textErrors('', 'isEmail', null)).toBeNull();
		expect(textErrors(null, 'isEmail', null)).toBeNull();
		expect(textErrors('anything', null, null)).toBeNull();
	});

	it('validates with the named validator.js method', () => {
		expect(textErrors('john@example.com', 'isEmail', null)).toBeNull();
		expect(textErrors('john', 'isEmail', null)).toEqual({ invalidisEmail: true });
		expect(textErrors('123', 'isNumeric', null)).toBeNull();
		expect(textErrors('12a', 'isNumeric', null)).toEqual({ invalidisNumeric: true });
		expect(textErrors(42, 'isNumeric', null)).toBeNull();
	});

	it('validates with a custom regex', () => {
		expect(textErrors('abc-123', 'regex', '^[a-z]+-\\d+$')).toBeNull();
		expect(textErrors('abc', 'regex', '^[a-z]+-\\d+$')).toEqual({ invalidPattern: true });
		expect(textErrors('abc', 'regex', '')).toBeNull();
	});

	it('passes (with a warning) on an invalid regex or unknown method', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(textErrors('abc', 'regex', '[')).toBeNull();
		expect(textErrors('abc', 'isNotAThing', null)).toBeNull();
		expect(warn).toHaveBeenCalledTimes(2);
	});

	it('maps validate types to the widget messages', () => {
		expect(textValidationMessage(null)).toBe('');
		expect(textValidationMessage('regex')).toBe("Value doesn't match the required pattern");
		expect(textValidationMessage('isUUID')).toBe('Invalid UUID');
		expect(textValidationMessage('isPort')).toBe('Invalid isPort');
	});

	it('works as a rule', () => {
		expect(textValidation('isEmail', null)('john@example.com')).toBe(true);
		expect(textValidation('isEmail', null)('john')).toBe('Invalid email address');
		expect(textValidation('regex', '^\\d+$')('x')).toBe("Value doesn't match the required pattern");
	});
});
