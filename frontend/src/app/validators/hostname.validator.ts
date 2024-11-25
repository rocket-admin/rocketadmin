import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

import isFQDN from 'validator/lib/isFQDN';
import isIP from 'validator/lib/isIP';
import is_ip_private from 'private-ip';
import { DBtype } from "../models/connection";

export function hostnameValidation(dbType: DBtype):ValidatorFn {
    return (control: AbstractControl) : ValidationErrors | null=> {
        if (control.value) {
            let hostname = (control.value as string);

            if (dbType === 'dynamodb') {
                if (!hostname.startsWith("https://")) {
                    return { 'missingHttps': true };
                }

                hostname = hostname.replace(/^https:\/\//, '');
            }

            if (dbType === 'mongodb') {
                hostname = hostname.replace(/^mongodb\+srv:\/\//, '');
            }

            if (control.value === 'localhost' || isIP(control.value) && is_ip_private(control.value)) return { 'isLocalhost': true }
            if (!(isIP(hostname) || isFQDN(hostname))) return { 'isInvalidHostname': true }
        }
    }
}
