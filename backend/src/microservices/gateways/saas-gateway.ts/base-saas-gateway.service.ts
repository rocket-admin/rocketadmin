import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { getErrorMessage } from '../../../helpers/get-error-message.js';
import { appConfig } from '../../../shared/config/app-config.js';
import { generateSaaSJwt } from './utils/generate-saas-jwt.js';

export type SaaSRequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type SaaSResponse = {
	status: number;
	body: Record<string, unknown>;
};

@Injectable()
export class BaseSaasGatewayService {
	protected readonly logger = new Logger(BaseSaasGatewayService.name);
	private readonly baseSaaSUrl = appConfig.thirdParty.saasUrl;

	async sendRequestToSaaS(
		patch: string,
		method: SaaSRequestMethod,
		body: Record<any, any> | null,
	): Promise<SaaSResponse | null> {
		try {
			if (!isSaaS()) {
				return null;
			}
			const bodyValue = body && method !== 'GET' ? JSON.stringify(body) : undefined;

			const jwtToken = generateSaaSJwt();
			const res = await fetch(`${this.baseSaaSUrl}${patch}`, {
				method: method,
				body: bodyValue,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${jwtToken}`,
				},
			});

			const { body: responseBody, parseFailure } = await this.readBody(res);
			if (res.status >= 400) {
				this.reportFailedRequest(method, patch, res.status, responseBody, parseFailure);
			} else if (parseFailure) {
				this.reportUnexpectedBody(method, patch, res, parseFailure);
			}
			return {
				status: res.status,
				body: responseBody,
			};
		} catch (e) {
			// A thrown fetch (DNS, refused connection, TLS) means SAAS_URL itself is unreachable.
			this.logger.error(`SaaS request ${method} ${patch} to ${this.baseSaaSUrl} threw: ${getErrorMessage(e)}`);
			Sentry.captureException(e);
			throw e;
		}
	}

	// Callers turn a failed call into their own error (often a plain 404), so the upstream
	// status and reason must be visible somewhere — here, once, for every core→saas call
	// (401 = MICROSERVICE_JWT_SECRET mismatch, 404 = row missing on the saas this core is
	// pointed at, 5xx = saas-side failure). Sentry groups by method + route shape + status, so a
	// broken edge is one issue with an event per call rather than one issue per id in the URL.
	private reportFailedRequest(
		method: SaaSRequestMethod,
		patch: string,
		status: number,
		body: Record<string, unknown>,
		parseFailure?: string,
	): void {
		const bodyNote = describeSaasErrorBody(body) || (parseFailure ? ` (${parseFailure})` : '');
		const message = `SaaS request ${method} ${patch} failed: HTTP ${status}${bodyNote}`;
		this.logger.warn(message);
		const route = normalizeSaasPath(patch);
		Sentry.withScope((scope) => {
			scope.setLevel(status >= 500 ? 'error' : 'warning');
			scope.setTag('saas_method', method);
			scope.setTag('saas_route', route);
			scope.setTag('saas_status', String(status));
			scope.setFingerprint(['saas-request-failed', method, route, String(status)]);
			Sentry.captureMessage(message);
		});
	}

	// A 2xx whose body is not JSON never came from a saas controller. The usual cause is
	// SAAS_URL pointing at something else on the same host — e.g. the SPA's nginx, whose
	// history-mode fallback answers 200 + index.html for any unknown path — or a redirect
	// that fetch followed. Content type, final URL and a body snippet pin that down.
	private reportUnexpectedBody(method: SaaSRequestMethod, patch: string, res: Response, parseFailure: string): void {
		const contentType = res.headers.get('content-type') ?? 'none';
		const message =
			`SaaS request ${method} ${patch} returned HTTP ${res.status} but ${parseFailure} ` +
			`(content-type: ${contentType}; final URL: ${res.url || 'n/a'}; redirected: ${res.redirected}) — ` +
			`SAAS_URL (${this.baseSaaSUrl}) does not seem to reach the saas API`;
		this.logger.error(message);
		const route = normalizeSaasPath(patch);
		Sentry.withScope((scope) => {
			scope.setLevel('error');
			scope.setTag('saas_method', method);
			scope.setTag('saas_route', route);
			scope.setTag('saas_status', String(res.status));
			scope.setTag('saas_content_type', contentType);
			scope.setFingerprint(['saas-request-non-json-body', method, route]);
			Sentry.captureMessage(message);
		});
	}

	// Parses the body as JSON; on failure returns `{}` (the historical contract every caller
	// relies on) plus a short description of what was actually there, for the reports above.
	private async readBody(res: Response): Promise<{ body: Record<string, unknown>; parseFailure?: string }> {
		let text: string;
		try {
			text = await res.text();
		} catch (error) {
			return { body: {}, parseFailure: `body could not be read: ${getErrorMessage(error)}` };
		}
		if (!text.trim()) {
			return { body: {}, parseFailure: 'the body is empty' };
		}
		try {
			const parsed: unknown = JSON.parse(text);
			if (parsed !== null && typeof parsed === 'object') {
				return { body: parsed as Record<string, unknown> };
			}
			return { body: {}, parseFailure: `the body is JSON but not an object (${typeof parsed})` };
		} catch (_error) {
			const snippet = text.slice(0, 160).replace(/\s+/g, ' ');
			return { body: {}, parseFailure: `the body is not JSON: "${snippet}"` };
		}
	}
}

// "— <message>" for the log line when the saas error body carries one; empty otherwise.
export function describeSaasErrorBody(body: Record<string, unknown>): string {
	const message = body?.message;
	if (typeof message === 'string' && message.length) {
		return ` — ${message.slice(0, 300)}`;
	}
	if (Array.isArray(message) && message.length) {
		return ` — ${message.map(String).join(', ').slice(0, 300)}`;
	}
	return '';
}

const UUID_SEGMENT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// Route shape for tags/fingerprints: ids in the path replaced with ":id", query string dropped.
export function normalizeSaasPath(patch: string): string {
	return patch.split('?')[0].replace(UUID_SEGMENT, ':id');
}
