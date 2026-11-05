// Form-level checks the auth pages disable their submit buttons on (Angular's `form.invalid`).
import { emailErrors } from '@/validators/email.validator';
import { passwordErrors } from '@/validators/password.validator';

/** UserPassword's rules: required, at least 8 characters, upper + lower case letter and a number. */
export function isValidNewPassword(value: string | null | undefined): boolean {
	return Boolean(value) && passwordErrors(value) === null;
}

/** A required email field with the emailValidator directive. */
export function isValidEmail(value: string | null | undefined): boolean {
	return Boolean(value) && emailErrors(value) === null;
}
