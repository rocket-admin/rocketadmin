import type { Request } from 'express';

export interface ICognitoDecodedData {
	at_hash: string;
	sub: string;
	aud: string | string[];
	email_verified: boolean;
	event_id: string;
	token_use: string;
	auth_time: number;
	iss: string;
	'cognito:username': string;
	exp: number;
	iat: number;
	email: string;
	/** Id of the user's company; null for tokens issued before the claim was added. */
	companyId: string | null;
}

/**
 * Request type with the cognito-derived JWT payload attached by auth middleware.
 *
 * `params` and `query` are narrowed to `Record<string, string | undefined>`. Express's stock
 * `query` type is `ParsedQs` (allows arrays and nested objects), but this codebase only
 * issues simple `?key=value` URLs — narrowing here surfaces accidental multi-value usage
 * without forcing every callsite to narrow inline.
 */
export interface IRequestWithCognitoInfo extends Omit<Request, 'query' | 'params'> {
	query: Record<string, string | undefined>;
	params: Record<string, string | undefined>;
	decoded: Partial<ICognitoDecodedData>;
	/**
	 * Set by `SaaSAuthMiddleware` once a request has passed microservice-JWT auth.
	 * The global throttler's `skipIf` reads this to exempt internal service-to-service
	 * calls from rate limiting (they all originate from the same satellite IPs).
	 */
	isMicroserviceRequest?: boolean;
}
