import { IEmailConfig, IEmailConfigService } from './email-config.interface';

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
    return {
      host: emailServiceHost,
      port: emailServicePort,
      secure: true,
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
