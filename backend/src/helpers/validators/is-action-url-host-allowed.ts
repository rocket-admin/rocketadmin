import dns from 'dns';
import ipRangeCheck from 'ip-range-check';
import { isSaaS } from '../app/is-saas.js';
import { isTest } from '../app/is-test.js';
import { Constants } from '../constants/constants.js';
import { getErrorMessage } from '../get-error-message.js';

export async function isActionUrlHostAllowed(url: string): Promise<boolean> {
	if (isTest()) {
		return true;
	}

	if (!isSaaS()) {
		return true;
	}

	try {
		const parsedUrl = new URL(url);
		const hostname = parsedUrl.hostname;

		if (ipRangeCheck(hostname, Constants.FORBIDDEN_HOSTS)) {
			return false;
		}

		return await new Promise<boolean>((resolve) => {
			dns.lookup(hostname, (err, address) => {
				if (err) {
					console.error('DNS lookup error for action URL:', err.message);
					resolve(false);
					return;
				}

				if (ipRangeCheck(address, Constants.FORBIDDEN_HOSTS)) {
					resolve(false);
				} else {
					resolve(true);
				}
			});
		});
	} catch (e) {
		console.error('Invalid URL format for action URL validation:', getErrorMessage(e));
		return false;
	}
}
