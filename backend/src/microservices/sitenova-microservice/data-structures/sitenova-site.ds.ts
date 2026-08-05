// Audience claim that marks a token as a SiteNova generated-site end-user token (a site visitor),
// keeping it cryptographically and logically separate from RocketAdmin platform user tokens.
export const SITENOVA_ENDUSER_AUDIENCE = 'sitenova:enduser';

// Token lifetime for generated-site visitors. Mirrors universal-backend's ENDUSER_TOKEN_TTL
// (plan 13 Step 1): shortened from 7d because these tokens have no server-side revocation yet, and
// kept identical across both services so a token issued by either has the same lifetime during
// cutover. Read once at module load from the shared env var; unset defaults to 24h.
export const SITENOVA_ENDUSER_TOKEN_TTL =
	process.env.ENDUSER_TOKEN_TTL && process.env.ENDUSER_TOKEN_TTL.length > 0 ? process.env.ENDUSER_TOKEN_TTL : '24h';

// JWT payload issued to a generated-site end-user on register/login.
export interface SitenovaEndUserTokenPayload {
	sub: string; // the user's identifier in the connection's users table (email by default)
	uid?: string; // the user's row primary key — basis for row-level authorization (plan 13); optional during cutover
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
