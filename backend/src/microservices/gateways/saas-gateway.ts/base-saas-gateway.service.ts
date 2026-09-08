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

			const responseBody = await this.bodyToJSON(res);
			if (res.status >= 400) {
				this.reportFailedRequest(method, patch, res.status, responseBody);
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
	): void {
		const message = `SaaS request ${method} ${patch} failed: HTTP ${status}${describeSaasErrorBody(body)}`;
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

	private async bodyToJSON(res: Response): Promise<Record<string, unknown>> {
		if (!res.body) {
			return {};
		}
		try {
			return await res.json();
		} catch (_error) {
			return {};
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
