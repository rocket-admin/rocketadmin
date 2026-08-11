import { Injectable } from '@nestjs/common';
import { WinstonLogger } from '../../../entities/logging/winston-logger.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { getErrorMessage } from '../../../helpers/get-error-message.js';
import { appConfig } from '../../../shared/config/app-config.js';
import { generateSaaSJwt } from './utils/generate-saas-jwt.js';

export type SentEmailWebhookResultDs = {
	messageId?: string;
	accepted?: Array<string>;
	rejected?: Array<string>;
};

// Plan 15 Phase 3: the core no longer composes or transports letters — it fires the
// saas-side composer webhook (POST /webhook/email/send) with the letter type and params.
@Injectable()
export class SaasEmailGatewayService {
	private static readonly REQUEST_TIMEOUT_MS = 4000;
	private readonly baseSaaSUrl = appConfig.thirdParty.saasUrl;

	constructor(private readonly logger: WinstonLogger) {}

	// An email failure must never fail the parent operation: ANY failure (non-2xx status,
	// network error, timeout) is logged as a warning and swallowed — the caller gets null.
	public async sendEmail(
		type: string,
		to: string,
		params: Record<string, unknown>,
	): Promise<SentEmailWebhookResultDs | null> {
		if (!isSaaS()) {
			return null;
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
				this.logger.warn(`Email webhook rejected "${type}" letter to "${to}": status ${res.status}`);
				return null;
			}
			const body = await this.bodyToJSON(res);
			return {
				messageId: typeof body.messageId === 'string' ? body.messageId : undefined,
				accepted: Array.isArray(body.accepted) ? (body.accepted as Array<string>) : [],
				rejected: Array.isArray(body.rejected) ? (body.rejected as Array<string>) : [],
			};
		} catch (error) {
			this.logger.warn(`Email webhook dispatch of "${type}" letter to "${to}" failed: ${getErrorMessage(error)}`);
			return null;
		}
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
