import { Injectable } from '@nestjs/common';
import { IEmailConfig, IEmailConfigService } from './email-config.interface.js';

@Injectable()
export class EmailConfigService implements IEmailConfigService {
  public getEmailServiceConfig(): IEmailConfig | string {
    const pullConfig = process.env.EMAIL_CONFIG_STRING;
    if (pullConfig) {
      return pullConfig;
    }
    const emailServiceHost = process.env.EMAIL_SERVICE_HOST;
    const emailServicePort = parseInt(process.env.EMAIL_SERVICE_PORT) || 25;
    const emailServiceUserName = process.env.EMAIL_SERVICE_USERNAME;
    const emailServicePassword = process.env.EMAIL_SERVICE_PASSWORD;
    const nonSecure = !process.env.NON_SSL_EMAIL;
    return {
      host: emailServiceHost,
      port: emailServicePort,
      secure: nonSecure,
      auth: {
        user: emailServiceUserName,
        pass: emailServicePassword,
      },
      socketTimeout: 4 * 1000,
      connectionTimeout: 4 * 1000,
      greetingTimeout: 4 * 1000,
    };
  }
}
