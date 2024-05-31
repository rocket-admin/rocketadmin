import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

import isFQDN from 'validator/lib/isFQDN';
import isIP from 'validator/lib/isIP';
import is_ip_private from 'private-ip';

export function hostnameValidation():ValidatorFn {
    return (control: AbstractControl) : ValidationErrors | null=> {
        if (control.value) {
            let hostname = (control.value as string).replace(/^mongodb\+srv:\/\//, '');

            if (control.value === 'localhost' || isIP(control.value) && is_ip_private(control.value)) return { 'isLocalhost': true }
            if (!(isIP(hostname) || isFQDN(hostname))) return { 'isInvalidHostname': true }
        }
    }
}
