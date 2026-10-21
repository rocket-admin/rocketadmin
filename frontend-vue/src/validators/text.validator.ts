// Port of validators/text.validator.ts: the text/long-text widgets validate with a `validator.js`
// method chosen by name in the widget params (`isEmail`, `isUUID`, ...) or with a custom regex.
import validator from 'validator';
import { toRule, type ValidationErrors, type ValidationRule } from './types';

// From getValidationErrorMessage() in the text and long-text record-edit widgets.
const TEXT_ERROR_MESSAGES: Record<string, string> = {
	isEmail: 'Invalid email address',
	isURL: 'Invalid URL',
	isIP: 'Invalid IP address',
	isUUID: 'Invalid UUID',
	isJSON: 'Invalid JSON',
	isCreditCard: 'Invalid credit card number',
	isISBN: 'Invalid ISBN',
	isAlpha: 'Should contain only letters',
	isNumeric: 'Should contain only numbers',
	isAlphanumeric: 'Should contain only letters and numbers',
	isHexColor: 'Invalid hex color',
	isBase64: 'Invalid Base64 string',
	isMobilePhone: 'Invalid mobile phone number',
	isMACAddress: 'Invalid MAC address',
	isPostalCode: 'Invalid postal code',
	isCurrency: 'Invalid currency format',
};

/** The message the widgets showed for a failed `validateType`. */
export function textValidationMessage(validateType: string | null | undefined): string {
	if (!validateType) return '';
	if (validateType === 'regex') return "Value doesn't match the required pattern";
	return TEXT_ERROR_MESSAGES[validateType] || `Invalid ${validateType}`;
}

/**
 * `{ invalidPattern: true }` or `{ invalid<validateType>: true }`, otherwise `null`. Unknown
 * validator names, invalid regexes and validators that throw all pass (with a console warning).
 */
export function textErrors(
	value: unknown,
	validateType: string | null | undefined,
	regexPattern: string | null | undefined,
): ValidationErrors | null {
	if (!value || value === '') return null;
	if (!validateType) return null;

	const stringValue = String(value);

	// Special case for regex validation
	if (validateType === 'regex') {
		if (!regexPattern) return null;
		try {
			if (!new RegExp(regexPattern).test(stringValue)) return { invalidPattern: true };
		} catch (error) {
			console.warn('Invalid regex pattern:', error);
		}
		return null;
	}

	const validatorMethod = (validator as unknown as Record<string, unknown>)[validateType];
	if (typeof validatorMethod !== 'function') {
		console.warn(`Unknown validator method: ${validateType}`);
		return null;
	}

	try {
		if (!validatorMethod(stringValue)) return { [`invalid${validateType}`]: true };
	} catch (error) {
		console.warn(`Validation error for ${validateType}:`, error);
	}
	return null;
}

export function textValidation(
	validateType: string | null | undefined,
	regexPattern: string | null | undefined,
): ValidationRule {
	return toRule(
		(value) => textErrors(value, validateType, regexPattern),
		() => textValidationMessage(validateType),
	);
}
