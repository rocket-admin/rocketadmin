// Port of validators/base64.validator.ts (used by the binary/file widgets' base64 mode).
import { toRule, type ValidationErrors, type ValidationRule } from './types';

export const BASE64_ERROR_MESSAGE = 'Invalid base64.';

/** `{ isInvalidBase64: true }` for a non-empty value that isn't padded base64, otherwise `null`. */
export function base64Errors(value: unknown): ValidationErrors | null {
	if (!value) return null;
	const text = String(value);
	const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
	if (text.length % 4 !== 0 || !base64Regex.test(text)) return { isInvalidBase64: true };
	return null;
}

export function base64Validation(): ValidationRule {
	return toRule(base64Errors, () => BASE64_ERROR_MESSAGE);
}
