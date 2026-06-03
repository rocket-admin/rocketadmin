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
		const forbidden = addresses.find(({ address }) => isForbiddenAddress(address));
		if (forbidden) {
			callback(new Error(`SSRF guard: refusing to connect to ${forbidden.address} for host ${hostname}`), '', 0);
			return;
		}
		const first = addresses[0];
		if (!first) {
			callback(new Error(`SSRF guard: no addresses resolved for host ${hostname}`), '', 0);
			return;
		}
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
