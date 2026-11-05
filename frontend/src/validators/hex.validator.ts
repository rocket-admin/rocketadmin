// Port of validators/hex.validator.ts (used by the binary/file widgets' hex mode).
import { toRule, type ValidationErrors, type ValidationRule } from './types';

export const HEX_ERROR_MESSAGE = 'Invalid hex.';

/** `{ isInvalidHex: true }` for a non-empty value that isn't an even-length hex string, otherwise `null`. */
export function hexErrors(value: unknown): ValidationErrors | null {
	if (!value) return null;
	const text = String(value);
	const hexRegex = /^[-+]?[0-9A-Fa-f]+\.?[0-9A-Fa-f]*?$/;
	if (!hexRegex.test(text) || text.length % 2 !== 0) return { isInvalidHex: true };
	return null;
}

export function hexValidation(): ValidationRule {
	return toRule(hexErrors, () => HEX_ERROR_MESSAGE);
}
