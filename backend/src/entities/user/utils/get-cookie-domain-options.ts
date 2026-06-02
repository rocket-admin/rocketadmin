import { appConfig } from '../../../shared/config/app-config.js';

export function getCookieDomainOptions(requestHostname: string): { domain: string } | undefined {
	const cookieDomain = appConfig.app.cookieDomain;
	if (cookieDomain && requestHostname?.includes(cookieDomain)) {
		return { domain: cookieDomain };
	}
	return undefined;
}
