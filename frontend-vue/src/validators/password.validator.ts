// Port of validators/password.validator.ts. Note the Angular quirk kept in passwordErrors: on failure
// every key is present and `true` means that requirement IS met (user-password's checklist read it so).
import { toRule, type ValidationErrors, type ValidationRule } from './types';

export interface PasswordRequirements extends ValidationErrors {
	oneUpperCaseLetter: boolean;
	oneNumber: boolean;
	oneLowerCaseLetter: boolean;
	min8: boolean;
}

// Wording of the (commented-out) checklist in user-password.component.html, in its order.
export const PASSWORD_REQUIREMENT_LABELS: Record<keyof PasswordRequirements & string, string> = {
	oneLowerCaseLetter: 'a lower case letter',
	oneUpperCaseLetter: 'an upper case letter',
	oneNumber: 'a number',
	min8: 'at least 8 characters',
};

/** `null` for an empty or strong password, otherwise which requirements are met. */
export function passwordErrors(value: unknown): PasswordRequirements | null {
	if (value == null || value === '') return null;
	const text = String(value);
	const requirements: PasswordRequirements = {
		oneUpperCaseLetter: /[A-Z]/.test(text),
		oneNumber: /[0-9]/.test(text),
		oneLowerCaseLetter: /[a-z]/.test(text),
		min8: text.length >= 8,
	};
	const valid =
		requirements.oneUpperCaseLetter && requirements.oneNumber && requirements.oneLowerCaseLetter && requirements.min8;
	return valid ? null : requirements;
}

/** "Password must contain: a number, at least 8 characters" — only the unmet requirements. */
export function passwordErrorMessage(errors: ValidationErrors): string {
	const missing = Object.entries(PASSWORD_REQUIREMENT_LABELS)
		.filter(([key]) => errors[key] === false)
		.map(([, label]) => label);
	return `Password must contain: ${missing.join(', ')}`;
}

export function passwordValidation(): ValidationRule {
	return toRule(passwordErrors, passwordErrorMessage);
}
