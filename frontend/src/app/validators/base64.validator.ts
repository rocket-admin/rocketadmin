import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function base64Validation(): ValidatorFn {
	return (control: AbstractControl): ValidationErrors | null => {
		if (!control.value) return null;
		const value = String(control.value);
		const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
		if (value.length % 4 !== 0 || !base64Regex.test(value)) return { isInvalidBase64: true };
		return null;
	};
}
