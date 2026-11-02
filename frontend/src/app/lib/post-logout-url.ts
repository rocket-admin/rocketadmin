export const ROCKETADMIN_SITE_URL = 'https://rocketadmin.com/';
export const SITENOVA_LOGIN_URL = 'https://app.sitenova.com/login';

/**
 * Where the SaaS build sends the browser after a logout (plan 84).
 *
 * The panel on `rocket.sitenova.com` is reached from the SiteNova app, so a SiteNova host returns
 * to that app's login page. Every other host returns to the RocketAdmin site.
 */
export function postLogoutUrl(hostname: string): string {
	const host = (hostname ?? '').trim().toLowerCase();
	if (host === 'sitenova.com' || host.endsWith('.sitenova.com')) {
		return SITENOVA_LOGIN_URL;
	}
	return ROCKETADMIN_SITE_URL;
}
