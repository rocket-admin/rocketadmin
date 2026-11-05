// Shared shapes for the validators ported from frontend/src/app/validators.

/** Same shape as Angular's ValidationErrors: error key -> details. */
export type ValidationErrors = Record<string, unknown>;

/** A form rule: `true` when valid, otherwise the message to show under the field. */
export type ValidationRule = (value: unknown) => true | string;

/** Wraps an errors function into a rule, mapping a failure to its message. */
export function toRule(
	errorsOf: (value: unknown) => ValidationErrors | null,
	messageOf: (errors: ValidationErrors) => string,
): ValidationRule {
	return (value) => {
		const errors = errorsOf(value);
		return errors ? messageOf(errors) : true;
	};
}
