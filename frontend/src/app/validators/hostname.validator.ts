import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import * as ipaddr from 'ipaddr.js';
import isFQDN from 'validator/es/lib/isFQDN';
import isIP from 'validator/es/lib/isIP';
import { DBtype } from '../models/connection';

const PRIVATE_RANGES = new Set(['private', 'loopback', 'linkLocal', 'unspecified', 'carrierGradeNat', 'uniqueLocal']);

function isPrivateIP(ip: string): boolean {
	try {
		return PRIVATE_RANGES.has(ipaddr.process(ip).range());
	} catch {
		return false;
	}
}

export function hostnameValidation(dbType: DBtype): ValidatorFn {
	return (control: AbstractControl): ValidationErrors | null => {
		if (control.value) {
			let hostname = control.value as string;

			if (dbType === 'dynamodb') {
				if (!hostname.startsWith('https://')) {
					return { missingHttps: true };
				}

				hostname = hostname.replace(/^https:\/\//, '');
			}

			if (dbType === 'mongodb') {
				hostname = hostname.replace(/^mongodb\+srv:\/\//, '');
			}

			if (control.value === 'localhost' || (isIP(control.value) && isPrivateIP(control.value)))
				return { isLocalhost: true };
			if (!(isIP(hostname) || isFQDN(hostname))) return { isInvalidHostname: true };
		}
	};
}
