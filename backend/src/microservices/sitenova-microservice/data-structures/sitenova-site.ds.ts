// Audience claim that marks a token as a SiteNova generated-site end-user token (a site visitor),
// keeping it cryptographically and logically separate from RocketAdmin platform user tokens.
export const SITENOVA_ENDUSER_AUDIENCE = 'sitenova:enduser';

// Token lifetime for generated-site visitors.
export const SITENOVA_ENDUSER_TOKEN_TTL = '7d';

// JWT payload issued to a generated-site end-user on register/login.
export interface SitenovaEndUserTokenPayload {
	sub: string; // the user's identifier in the connection's users table (email by default)
	cid: string; // connectionId the token is bound to
	aud: string; // SITENOVA_ENDUSER_AUDIENCE
}

// Input DS for the register/login use cases.
export class SitenovaRegisterEndUserDs {
	connectionId: string;
	tableName: string;
	email: string;
	password: string;
	emailField: string;
	passwordField: string;
	extra: Record<string, unknown>;
}

export class SitenovaLoginEndUserDs {
	connectionId: string;
	tableName: string;
	email: string;
	password: string;
	emailField: string;
	passwordField: string;
}

// Result of register/login: an end-user token plus the public (password-stripped) user row.
export class SitenovaEndUserAuthResultDs {
	token: string;
	user: Record<string, unknown>;
}
