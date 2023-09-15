import { Injectable } from '@nestjs/common';
import Sentry from '@sentry/node';
import { generateSaaSJwt } from './utils/generate-saas-jwt.js';

export type SaaSRequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type SaaSResponse = {
  status: number;
  body: Record<string, unknown>;
};

@Injectable()
export class BaseSaasGatewayService {
  private readonly baseSaaSUrl = process.env.SAAS_URL || 'http://rocketadmin-private-microservice:3001';

  async sendRequestToSaaS(patch: string, method: SaaSRequestMethod, body: Record<any, any>): Promise<SaaSResponse> {
    try {
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

      return {
        status: res.status,
        body: await this.bodyToJSON(res),
      };
    } catch (e) {
      Sentry.captureException(e);
      throw e;
    }
  }

  private async bodyToJSON(res: Response): Promise<Record<string, unknown>> {
    if (!res.body) {
      return {};
    }
    try {
      return await res.json();
    } catch (error) {
      return {};
    }
  }
}
