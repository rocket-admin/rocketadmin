import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export function urlValidation(prefix: string = ''):ValidatorFn {
    return (control: AbstractControl) : ValidationErrors | null=> {

        if (control.value) {
            let url = (control.value as string);

            // If there's a prefix, prepend it to the URL for validation
            const fullUrl = prefix ? prefix + url : url;

            try {
                new URL(fullUrl);
            }
            catch (e) {
                return { 'isInvalidURL': true };
            }
        }
        return null;
    }
}
