import { NextFunction, Request, Response } from 'express';

const PUBLIC_CRUD_ROUTE_REGEX = /\/table\/crud(\/|$)/;

/**
 * Wildcard CORS for the public table CRUD routes (TablePureCrudOperationsController).
 *
 * These endpoints support public / api-key access and may be called from any origin.
 * A literal `Access-Control-Allow-Origin: *` cannot be combined with credentials, so we reflect
 * the request's Origin back instead — this allows any origin while still permitting cookie /
 * credentialed requests. Must be registered before the global enableCors() so it owns these
 * routes (including answering the OPTIONS preflight) before the global allowlist runs.
 */
export function publicCrudCorsMiddleware(req: Request, res: Response, next: NextFunction): void {
	if (PUBLIC_CRUD_ROUTE_REGEX.test(req.path)) {
		const requestOrigin = req.headers.origin;
		if (requestOrigin) {
			res.header('Access-Control-Allow-Origin', requestOrigin);
			res.header('Access-Control-Allow-Credentials', 'true');
			res.header('Vary', 'Origin');
			res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
			res.header(
				'Access-Control-Allow-Headers',
				(req.headers['access-control-request-headers'] as string) ??
					'Content-Type, Authorization, x-api-key, masterpwd',
			);
		}
		if (req.method === 'OPTIONS') {
			res.sendStatus(204);
			return;
		}
	}
	next();
}
