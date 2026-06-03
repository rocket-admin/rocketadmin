import ipRangeCheck from 'ip-range-check';
import { Constants } from '../constants/constants.js';

export function isForbiddenAddress(address: string): boolean {
	const normalized = address.startsWith('::ffff:') && address.includes('.') ? address.slice('::ffff:'.length) : address;
	return ipRangeCheck(normalized, Constants.FORBIDDEN_HOSTS);
}
