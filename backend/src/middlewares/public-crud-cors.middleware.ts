import { NextFunction, Request, Response } from 'express';

const PUBLIC_CRUD_ROUTE_REGEX = /\/table\/crud(\/|$)/;

// Browser-facing SiteNova site API (register/login + data CRUD) served to AI-generated sites from
// arbitrary CDN origins. Anchored at the start of the path so it matches `/sitenova/...` but never
// the server-to-server `/internal/sitenova/...` controller, which needs no CORS.
const SITENOVA_PUBLIC_ROUTE_REGEX = /^\/sitenova\//;

// `scheme://host[:port]` (or the literal "null" origin). Deliberately strict: any value that does
// not look like a real origin is dropped rather than reflected.
const VALID_ORIGIN_REGEX = /^(null|[a-z][a-z0-9+.-]*:\/\/[a-z0-9.-]+(:\d+)?)$/i;

// The charset allowed in an HTTP header field-name list (what a browser sends in
// Access-Control-Request-Headers). Excludes CR/LF and anything outside the token grammar.
const VALID_HEADER_LIST_REGEX = /^[a-z0-9,\- ]+$/i;

const DEFAULT_ALLOWED_HEADERS = 'Content-Type, Authorization, x-api-key, masterpwd';

/**
 * Wildcard CORS for the public table CRUD routes (TablePureCrudOperationsController).
 *
 * These endpoints support public / api-key access and may be called from any origin.
 * A literal `Access-Control-Allow-Origin: *` cannot be combined with credentials, so we reflect
 * the request's Origin back instead — this allows any origin while still permitting cookie /
 * credentialed requests. Must be registered before the global enableCors() so it owns these
 * routes (including answering the OPTIONS preflight) before the global allowlist runs.
 *
 * Reflected request values (Origin, Access-Control-Request-Headers) are validated against strict
 * allowlists before being echoed back, so no untrusted input reaches a response header
 * (defense-in-depth against header injection / CWE-113).
 */
export function publicCrudCorsMiddleware(req: Request, res: Response, next: NextFunction): void {
	if (PUBLIC_CRUD_ROUTE_REGEX.test(req.path) || SITENOVA_PUBLIC_ROUTE_REGEX.test(req.path)) {
		const requestOrigin = req.headers.origin;
		if (requestOrigin && VALID_ORIGIN_REGEX.test(requestOrigin)) {
			const requestedHeaders = req.headers['access-control-request-headers'];
			const allowedHeaders =
				typeof requestedHeaders === 'string' && VALID_HEADER_LIST_REGEX.test(requestedHeaders)
					? requestedHeaders
					: DEFAULT_ALLOWED_HEADERS;

			res.header('Access-Control-Allow-Origin', requestOrigin);
			res.header('Access-Control-Allow-Credentials', 'true');
			res.header('Vary', 'Origin');
			res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
			res.header('Access-Control-Allow-Headers', allowedHeaders);
		}
		if (req.method === 'OPTIONS') {
			res.sendStatus(204);
			return;
		}
	}
	next();
}
