import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";
import is_ip_private from 'private-ip';
import isFQDN from 'validator/lib/isFQDN';
import isIP from 'validator/lib/isIP';

export function hostnameValidation():ValidatorFn {
    return (control: AbstractControl) : ValidationErrors | null=> {
        if (control.value) {
            if (control.value === 'localhost' || isIP(control.value) && is_ip_private(control.value)) return { 'isLocalhost': true }
            if (!(isIP(control.value) || isFQDN(control.value))) return { 'isInvalidHostname': true }
        }
    }
}