import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { WinstonLogger } from '../../../entities/logging/winston-logger.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { getErrorMessage } from '../../../helpers/get-error-message.js';
import { appConfig } from '../../../shared/config/app-config.js';
import { generateSaaSJwt } from './utils/generate-saas-jwt.js';

export type SentEmailWebhookResultDs = {
	messageId?: string;
	accepted: Array<string>;
	rejected: Array<string>;
	// Delivery error detail the saas transporter reported alongside a 2xx
	// best-effort response (rejected letters still come back as 201).
	deliveryError?: string;
};

// The webhook call either produced a delivery result or failed with a named
// reason ('http 404', 'fetch failed: …', 'timed out after 4000ms', …) — the
// reason is what the cron report surfaces instead of a bare null.
export type EmailWebhookOutcome = { ok: true; result: SentEmailWebhookResultDs } | { ok: false; reason: string };

// Plan 15 Phase 3: the core no longer composes or transports letters — it fires the
// saas-side composer webhook (POST /webhook/email/send) with the letter type and params.
@Injectable()
export class SaasEmailGatewayService {
	private static readonly REQUEST_TIMEOUT_MS = 4000;
	private readonly baseSaaSUrl = appConfig.thirdParty.saasUrl;

	constructor(private readonly logger: WinstonLogger) {}

	// An email failure must never fail the parent operation: ANY failure (non-2xx status,
	// network error, timeout) is logged and swallowed — the caller gets a named
	// { ok: false, reason } instead of an exception.
	public async sendEmail(type: string, to: string, params: Record<string, unknown>): Promise<EmailWebhookOutcome> {
		if (!isSaaS()) {
			return { ok: false, reason: 'suppressed: not SaaS' };
		}
		try {
			const jwtToken = generateSaaSJwt();
			const res = await fetch(`${this.baseSaaSUrl}/webhook/email/send`, {
				method: 'POST',
				body: JSON.stringify({ type, to, params }),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${jwtToken}`,
				},
				signal: AbortSignal.timeout(SaasEmailGatewayService.REQUEST_TIMEOUT_MS),
			});
			if (res.status > 299) {
				const body = await this.bodyToJSON(res);
				const bodyMessage = typeof body.message === 'string' ? `: ${body.message}` : '';
				const reason = `http ${res.status}${bodyMessage}`;
				this.logger.warn(`Email webhook rejected "${type}" letter to "${to}": ${reason}`);
				Sentry.captureMessage(`Email webhook rejected "${type}" letter: ${reason}`);
				return { ok: false, reason };
			}
			const body = await this.bodyToJSON(res);
			return {
				ok: true,
				result: {
					messageId: typeof body.messageId === 'string' ? body.messageId : undefined,
					accepted: Array.isArray(body.accepted) ? (body.accepted as Array<string>) : [],
					rejected: Array.isArray(body.rejected) ? (body.rejected as Array<string>) : [],
					deliveryError: typeof body.error === 'string' ? body.error : undefined,
				},
			};
		} catch (error) {
			const reason = this.describeFetchError(error);
			this.logger.warn(`Email webhook dispatch of "${type}" letter to "${to}" failed: ${reason}`);
			Sentry.captureException(error);
			return { ok: false, reason };
		}
	}

	private describeFetchError(error: unknown): string {
		if (error instanceof Error && error.name === 'TimeoutError') {
			return `timed out after ${SaasEmailGatewayService.REQUEST_TIMEOUT_MS}ms`;
		}
		return `fetch failed: ${getErrorMessage(error)}`;
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
