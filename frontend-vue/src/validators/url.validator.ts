// Port of validators/url.validator.ts (used by the url and image widgets).
import { toRule, type ValidationErrors, type ValidationRule } from './types';

export const URL_ERROR_MESSAGE = 'URL is invalid.';

/** `{ isInvalidURL: true }` when `prefix + value` doesn't parse as a URL, otherwise `null`. */
export function urlErrors(value: unknown, prefix = ''): ValidationErrors | null {
	if (!value) return null;
	const url = String(value);
	// If there's a prefix, prepend it to the URL for validation
	const fullUrl = prefix ? prefix + url : url;
	try {
		new URL(fullUrl);
	} catch {
		return { isInvalidURL: true };
	}
	return null;
}

export function urlValidation(prefix = ''): ValidationRule {
	return toRule(
		(value) => urlErrors(value, prefix),
		() => URL_ERROR_MESSAGE,
	);
}
