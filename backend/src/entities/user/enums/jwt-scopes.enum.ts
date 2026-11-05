export enum JwtScopesEnum {
	TWO_FA_ENABLE = '2fa_enable',
	// Session restricted to finishing email confirmation. Registration (and login of an
	// unconfirmed user) in rocketadmin-saas issues a token carrying this, and it is refused
	// everywhere except the routes that complete the flow — see assertTokenScopeAllowed.
	EMAIL_VERIFY = 'email_verify',
	// rocketadmin-saas issues it for a support session that acts as a user. The core accepts it
	// as a normal session today. The enum entry makes the scope visible to the core. A route
	// can refuse it later.
	IMPERSONATED = 'impersonated',
}
