import { describe, expect, it } from 'vitest';
import { urlErrors, urlValidation } from './url.validator';

describe('url validator', () => {
	it('passes empty values and parseable URLs', () => {
		for (const value of ['', null, 'https://example.com/a?b=c', 'mailto:me@example.com'])
			expect(urlErrors(value)).toBeNull();
	});

	it('rejects values that do not parse', () => {
		expect(urlErrors('example.com')).toEqual({ isInvalidURL: true });
		expect(urlErrors('http://')).toEqual({ isInvalidURL: true });
	});

	it('validates prefix + value', () => {
		expect(urlErrors('images/a.png', 'https://cdn.example.com/')).toBeNull();
		expect(urlValidation('https://cdn.example.com/')('a.png')).toBe(true);
	});

	it('works as a rule', () => {
		expect(urlValidation()('nope')).toBe('URL is invalid.');
	});
});
