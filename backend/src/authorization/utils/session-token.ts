import { Constants } from '../../helpers/constants/constants.js';

interface RequestWithCookies {
	headers?: { cookie?: string | Array<string> };
	cookies?: Record<string, string>;
}

/**
 * Every value of one cookie name, in the order the browser sent them.
 *
 * Express `cookie-parser` keeps only the first value of a duplicated name. A browser can hold a
 * host-only copy and a domain copy of the session cookie (plan 84), so the middlewares read the
 * raw header here.
 */
export function extractSessionTokens(
	cookieHeader: string | Array<string> | undefined,
	name: string = Constants.JWT_COOKIE_KEY_NAME,
): Array<string> {
	const raw = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
	if (!raw) {
		return [];
	}
	const tokens: Array<string> = [];
	for (const pair of raw.split(';')) {
		const separator = pair.indexOf('=');
		if (separator === -1) {
			continue;
		}
		if (pair.slice(0, separator).trim() !== name) {
			continue;
		}
		let value = pair.slice(separator + 1).trim();
		if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
			value = value.slice(1, -1);
		}
		if (!value) {
			continue;
		}
		tokens.push(safeDecode(value));
	}
	return tokens;
}

/** The `iat` claim of a JWT, read without a signature check. Null for anything unreadable. */
export function readIssuedAt(token: string): number | null {
	const parts = token.split('.');
	if (parts.length < 2) {
		return null;
	}
	try {
		const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
		return typeof payload?.iat === 'number' ? payload.iat : null;
	} catch (_e) {
		return null;
	}
}

/**
 * The token to authenticate when the browser sent more than one session cookie (plan 84).
 *
 * The newest `iat` wins: the latest login states the user's intent. A tie keeps the browser
 * order. A token without a readable `iat` ranks last.
 */
export function selectSessionToken(tokens: Array<string>): string | undefined {
	if (tokens.length <= 1) {
		return tokens[0];
	}
	let best = tokens[0];
	let bestIssuedAt = readIssuedAt(best) ?? -1;
	for (const token of tokens.slice(1)) {
		const issuedAt = readIssuedAt(token) ?? -1;
		if (issuedAt > bestIssuedAt) {
			best = token;
			bestIssuedAt = issuedAt;
		}
	}
	return best;
}

/**
 * All session tokens of a request, without duplicates. The raw `Cookie` header is the source.
 * A request without the header falls back to the parsed `cookies` object, which the unit tests
 * build directly.
 */
export function getSessionTokensFromRequest(
	req: RequestWithCookies,
	name: string = Constants.JWT_COOKIE_KEY_NAME,
): Array<string> {
	const fromHeader = extractSessionTokens(req.headers?.cookie, name);
	if (fromHeader.length > 0) {
		return Array.from(new Set(fromHeader));
	}
	const parsed = req.cookies?.[name];
	return parsed ? [parsed] : [];
}

/** The one session token a request authenticates with, or undefined. */
export function getSessionTokenFromRequest(
	req: RequestWithCookies,
	name: string = Constants.JWT_COOKIE_KEY_NAME,
): string | undefined {
	return selectSessionToken(getSessionTokensFromRequest(req, name));
}

function safeDecode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch (_e) {
		return value;
	}
}
