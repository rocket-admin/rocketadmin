import type { AxiosRequestConfig } from 'axios';
import dns from 'dns';
import http from 'http';
import https from 'https';
import net from 'net';
import { isSaaS } from '../app/is-saas.js';
import { isTest } from '../app/is-test.js';
import { isForbiddenAddress } from './is-forbidden-address.js';

const SSRF_REQUEST_TIMEOUT_MS = 10_000;

export const ssrfGuardLookup: net.LookupFunction = (hostname, options, callback) => {
	dns.lookup(hostname, { all: true, family: options.family, hints: options.hints }, (err, addresses) => {
		if (err) {
			callback(err, '', 0);
			return;
		}
		// Keep only the public addresses. We deliberately do NOT reject the whole host just because one of
		// its records is private (split-horizon DNS, stray records); we simply never connect to a forbidden
		// one. The request is refused only when no usable address remains.
		const allowed = addresses.filter(({ address }) => !isForbiddenAddress(address));
		if (allowed.length === 0) {
			callback(
				new Error(`SSRF guard: refusing to connect to ${hostname}; all resolved addresses are forbidden`),
				'',
				0,
			);
			return;
		}
		// Honour the "all" form so Node keeps every allowed address and can fall back across them
		// (Happy Eyeballs / IPv6-first hosts on IPv4-only egress). Otherwise return the first allowed one.
		if (options.all) {
			callback(null, allowed);
			return;
		}
		const first = allowed[0];
		callback(null, first.address, first.family);
	});
};

const ssrfSafeHttpAgent = new http.Agent({ lookup: ssrfGuardLookup });
const ssrfSafeHttpsAgent = new https.Agent({ lookup: ssrfGuardLookup });

export function getSsrfSafeRequestConfig(): AxiosRequestConfig {
	const config: AxiosRequestConfig = { timeout: SSRF_REQUEST_TIMEOUT_MS };

	if (isSaaS() && !isTest()) {
		config.httpAgent = ssrfSafeHttpAgent;
		config.httpsAgent = ssrfSafeHttpsAgent;
		config.maxRedirects = 0;
	}

	return config;
}
