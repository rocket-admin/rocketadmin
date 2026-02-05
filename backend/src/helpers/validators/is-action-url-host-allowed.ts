import dns from 'dns';
import ipRangeCheck from 'ip-range-check';
import { Constants } from '../constants/constants.js';
import { isSaaS } from '../app/is-saas.js';

export async function isActionUrlHostAllowed(url: string): Promise<boolean> {
	if (process.env.NODE_ENV === 'test') {
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
		console.error('Invalid URL format for action URL validation:', e.message);
		return false;
	}
}
