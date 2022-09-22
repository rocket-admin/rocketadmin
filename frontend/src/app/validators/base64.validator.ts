import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export function base64Validation():ValidatorFn {
    return (control: AbstractControl) : ValidationErrors | null=> {
        if (control.value) {
            try {
                atob(control.value);
            } catch(e) {
                console.log(e);
                return { 'isInvalidBase64': true }
            };
        }
    }
}