import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { isSaaS } from '../../helpers/app/is-saas.js';
import { isTest } from '../../helpers/app/is-test.js';
import { appConfig } from '../config/app-config.js';

interface TurnstileVerifyResponse {
	success: boolean;
	'error-codes'?: string[];
	challenge_ts?: string;
	hostname?: string;
}

@Injectable()
export class TurnstileService {
	private readonly verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

	async verifyToken(token: string): Promise<boolean> {
		const secretKey = appConfig.thirdParty.turnstileSecretKey;

		if (isTest() || !isSaaS()) {
			return true;
		}

		if (!token || typeof token !== 'string') {
			throw new BadRequestException('Turnstile token is required.');
		}

		if (!secretKey) {
			throw new BadRequestException('Turnstile secret key is not configured.');
		}

		const formData = new URLSearchParams();
		formData.append('secret', secretKey);
		formData.append('response', token);

		try {
			const response = await axios.post<TurnstileVerifyResponse>(this.verifyUrl, formData.toString(), {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});

			if (!response.data.success) {
				const errorCodes = response.data['error-codes']?.join(', ') || 'Unknown error';
				throw new BadRequestException(`Turnstile verification failed: ${errorCodes}`);
			}
		} catch (error) {
			if (error instanceof BadRequestException) throw error;
			const err = error as { response?: { data?: unknown }; message?: string };
			console.error('Turnstile verification error:', err?.response?.data || err?.message || error);
			throw new BadRequestException('Turnstile verification failed. Please try again.');
		}

		return true;
	}
}
