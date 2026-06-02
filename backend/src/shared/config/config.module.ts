import { Global, Module } from '@nestjs/common';
import { appConfig } from './app-config.js';
import { ConfigService } from './config.service.js';

@Global()
@Module({
	providers: [
		{
			provide: ConfigService,
			useFactory: () => {
				const service = new ConfigService();
				appConfig.validate();
				return service;
			},
		},
	],
	exports: [ConfigService],
})
export class ConfigModule {}
