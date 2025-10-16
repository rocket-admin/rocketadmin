import * as validator from 'validator';

import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export function textValidation(validateType: string, regexPattern: string):ValidatorFn {
    return (control: AbstractControl) : ValidationErrors | null=> {

        if (!control.value || control.value === '') {
            return null;
        }

        if (!validateType) {
            return null;
        }

        const stringValue = String(control.value);

        // Special case for regex validation
        if (validateType === 'regex') {
        if (!regexPattern) {
            return null;
        }
        try {
            const regex = new RegExp(regexPattern);
            if (!regex.test(stringValue)) {
            return { invalidPattern: true };
            }
        } catch (error) {
            console.warn('Invalid regex pattern:', error);
            return null;
        }
        return null;
        }

        // Check if validator has this method
        const validatorMethod = validator[validateType];
        if (typeof validatorMethod !== 'function') {
        console.warn(`Unknown validator method: ${validateType}`);
        return null;
        }

        try {
        // Call the validator method
        const isValid = validatorMethod(stringValue);
        if (!isValid) {
            return { [`invalid${validateType}`]: true };
        }
        } catch (error) {
        console.warn(`Validation error for ${validateType}:`, error);
        return null;
        }

        return null;
    }
}
