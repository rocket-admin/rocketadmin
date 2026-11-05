import { describe, expect, it } from 'vitest';
import { postLogoutUrl, ROCKETADMIN_SITE_URL, SITENOVA_LOGIN_URL } from './post-logout-url';

describe('postLogoutUrl', () => {
	it('returns the SiteNova login page for a SiteNova host', () => {
		expect(postLogoutUrl('rocket.sitenova.com')).toBe(SITENOVA_LOGIN_URL);
		expect(postLogoutUrl('SiteNova.com')).toBe(SITENOVA_LOGIN_URL);
	});

	it('returns the RocketAdmin site for every other host', () => {
		expect(postLogoutUrl('app.rocketadmin.com')).toBe(ROCKETADMIN_SITE_URL);
		expect(postLogoutUrl('sitenova.com.evil.net')).toBe(ROCKETADMIN_SITE_URL);
		expect(postLogoutUrl('')).toBe(ROCKETADMIN_SITE_URL);
	});
});
