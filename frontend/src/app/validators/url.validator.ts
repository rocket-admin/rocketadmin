import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

import isFQDN from 'validator/lib/isFQDN';

export function urlValidation():ValidatorFn {
    return (control: AbstractControl) : ValidationErrors | null=> {

        console.log('urlValidation', control.value);
        if (control.value) {
            let url = (control.value as string);

            try {
                new URL(url);
            }
            catch (e) {
                return { 'isInvalidURL': true };
            }
        }
    }
}
