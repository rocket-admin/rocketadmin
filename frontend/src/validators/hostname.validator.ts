// Port of validators/hostname.validator.ts (the connect-db credentials forms).
import ipaddr from 'ipaddr.js';
import isFQDN from 'validator/es/lib/isFQDN';
import isIP from 'validator/es/lib/isIP';
import type { DBtype } from '@/models/connection';
import { toRule, type ValidationErrors, type ValidationRule } from './types';

export const HOSTNAME_ERROR_MESSAGES = {
	missingHttps: 'Hostname must start with "https://"',
	// The forms render this one with a Pinggy guide link and a "connect through an agent" button.
	isLocalhost: 'To connect a database to an internal IP, use something like Pinggy, or connect through an agent',
	isInvalidHostname: 'Hostname is invalid',
} as const;

const PRIVATE_RANGES = new Set(['private', 'loopback', 'linkLocal', 'unspecified', 'carrierGradeNat', 'uniqueLocal']);

/** `{ missingHttps | isLocalhost | isInvalidHostname: true }`, or `null` for an empty or valid hostname. */
export function hostnameErrors(value: unknown, dbType: DBtype | string): ValidationErrors | null {
	if (!value) return null;
	const raw = String(value);
	let hostname = raw;

	if (dbType === 'dynamodb') {
		if (!hostname.startsWith('https://')) return { missingHttps: true };
		hostname = hostname.replace(/^https:\/\//, '');
	}

	if (dbType === 'mongodb') {
		hostname = hostname.replace(/^mongodb\+srv:\/\//, '');
	}

	// Checked on the raw value, as in Angular.
	if (raw === 'localhost' || (isIP(raw) && isPrivateIP(raw))) return { isLocalhost: true };
	if (!(isIP(hostname) || isFQDN(hostname))) return { isInvalidHostname: true };
	return null;
}

export function hostnameValidation(dbType: DBtype | string): ValidationRule {
	return toRule(
		(value) => hostnameErrors(value, dbType),
		(errors) => HOSTNAME_ERROR_MESSAGES[firstKey(errors) as keyof typeof HOSTNAME_ERROR_MESSAGES],
	);
}

function isPrivateIP(ip: string): boolean {
	try {
		return PRIVATE_RANGES.has(ipaddr.process(ip).range());
	} catch {
		return false;
	}
}

function firstKey(errors: ValidationErrors): string {
	return Object.keys(errors)[0] ?? '';
}
