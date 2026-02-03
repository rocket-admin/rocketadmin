import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';

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
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    if (!secretKey) {
      console.warn('Turnstile secret key is not configured. Skipping verification.');
      return true;
    }

    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Turnstile token is required.');
    }

    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);

    const response = await axios.post<TurnstileVerifyResponse>(this.verifyUrl, formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.data.success) {
      const errorCodes = response.data['error-codes']?.join(', ') || 'Unknown error';
      throw new BadRequestException(`Turnstile verification failed: ${errorCodes}`);
    }

    return true;
  }
}
