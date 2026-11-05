import { appConfig } from '../../../shared/config/app-config.js';

/**
 * The registrable domains from `ROCKETADMIN_COOKIE_DOMAIN`, a comma-separated list such as
 * `rocketadmin.com,sitenova.com`. A single value is a list of one. The parser drops a leading dot.
 */
export function parseCookieDomains(raw: string | null | undefined): Array<string> {
	if (!raw) {
		return [];
	}
	return raw
		.split(',')
		.map((domain) => domain.trim().toLowerCase().replace(/^\./, ''))
		.filter((domain) => domain.length > 0);
}

/**
 * The first configured domain that equals the request hostname or that is a dotted suffix of it.
 * `app.sitenova.com` matches `sitenova.com`. `sitenova.com.evil.net` matches nothing.
 */
export function matchCookieDomain(
	requestHostname: string | null | undefined,
	domains: Array<string>,
): string | undefined {
	const hostname = requestHostname?.trim().toLowerCase();
	if (!hostname) {
		return undefined;
	}
	return domains.find((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

/**
 * The `Domain` attribute of the session cookie for a request hostname.
 *
 * The saas keeps an identical copy of this rule. Both services set the same cookie on the same
 * hosts, so they must agree. Otherwise a browser on `rocket.sitenova.com` holds two cookies with
 * the same name and a logout clears only one of them (plan 84).
 */
export function getCookieDomainOptions(
	requestHostname: string,
	domains: Array<string> = parseCookieDomains(appConfig.app.cookieDomain),
): { domain: string } | undefined {
	const domain = matchCookieDomain(requestHostname, domains);
	return domain ? { domain } : undefined;
}
