import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export function hexValidation():ValidatorFn {
    return (control: AbstractControl) : ValidationErrors | null=> {
        if (control.value) {
            const hexRegex = /^[-+]?[0-9A-Fa-f]+\.?[0-9A-Fa-f]*?$/;
            if (!hexRegex.test(control.value) || !(control.value.length % 2 == 0)) return { 'isInvalidHex': true };
            // don't make return if valid! or return null
        }
    }
}