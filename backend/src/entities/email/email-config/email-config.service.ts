import { Injectable } from '@nestjs/common';
import { appConfig } from '../../../shared/config/app-config.js';
import { IEmailConfig, IEmailConfigService } from './email-config.interface.js';

@Injectable()
export class EmailConfigService implements IEmailConfigService {
	public getEmailServiceConfig(): IEmailConfig | string {
		const { configString, host, port, username, password, nonSecure } = appConfig.email;
		if (configString) {
			return configString;
		}
		return {
			host: host ?? '',
			port: port,
			secure: nonSecure,
			auth: {
				user: username ?? '',
				pass: password ?? '',
			},
			socketTimeout: 4 * 1000,
			connectionTimeout: 4 * 1000,
			greetingTimeout: 4 * 1000,
		};
	}
}
