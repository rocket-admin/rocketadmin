import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export function passwordValidation():ValidatorFn {
    return (control: AbstractControl) : ValidationErrors | null=> {
        if (control.value !== null) {
            let errors = {} as any;

            errors.oneUpperCaseLetter = /[A-Z]/.test(control.value);
            errors.oneNumber = /[0-9]/.test(control.value);
            errors.oneLowerCaseLetter = /[a-z]/.test(control.value);
            errors.min8 = control.value.length >= 8;

            if (errors.oneUpperCaseLetter && errors.oneNumber && errors.oneLowerCaseLetter && errors.min8) {
                return null // return null if valid!
            } else {
                return errors
            }
        }
    }
}