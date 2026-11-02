import { Response } from 'express';
import { Constants } from '../../../helpers/constants/constants.js';
import { appConfig } from '../../../shared/config/app-config.js';
import { matchCookieDomain, parseCookieDomains } from './get-cookie-domain-options.js';

const EXPIRED = new Date(0);

/**
 * Clear the session cookie pair in every scope the platform can have used (plan 84).
 *
 * A cookie identity is the name, the domain, the path and the host-only flag. The core and the
 * saas set the pair on the same hosts, so a browser can hold a host-only copy and a domain copy.
 * One expired `Set-Cookie` per scope removes both. The attributes mirror the login, so the browser
 * matches the cookie it holds. On a configured domain the response also carries
 * `Clear-Site-Data: "cookies"`, which removes stale copies on sibling hosts of that domain.
 *
 * WARNING: `Clear-Site-Data` removes every cookie of the registrable domain. The helper sends it
 * only for a matched configured domain. A self-hosted instance without `ROCKETADMIN_COOKIE_DOMAIN`
 * and a white-label host never send it.
 */
export function clearSessionCookies(
	response: Response,
	requestHostname: string,
	domains: Array<string> = parseCookieDomains(appConfig.app.cookieDomain),
): void {
	const domain = matchCookieDomain(requestHostname, domains);
	const scopes: Array<{ domain?: string }> = domain ? [{}, { domain }] : [{}];
	for (const scope of scopes) {
		response.cookie(Constants.JWT_COOKIE_KEY_NAME, '', {
			httpOnly: true,
			secure: true,
			expires: EXPIRED,
			...scope,
		});
		response.cookie(Constants.ROCKETADMIN_AUTHENTICATED_COOKIE, '', {
			httpOnly: false,
			expires: EXPIRED,
			...scope,
		});
	}
	if (domain) {
		response.setHeader('Clear-Site-Data', '"cookies"');
	}
}
