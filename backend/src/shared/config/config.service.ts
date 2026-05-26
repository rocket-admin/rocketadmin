import { Injectable } from '@nestjs/common';
import { DataSourceOptions } from 'typeorm';
import {
	AppSectionConfig,
	AuthConfig,
	appConfig,
	DbConfig,
	EmailConfig,
	TestDbConfig,
	ThirdPartyConfig,
} from './app-config.js';

@Injectable()
export class ConfigService {
	public get auth(): AuthConfig {
		return appConfig.auth;
	}

	public get app(): AppSectionConfig {
		return appConfig.app;
	}

	public get db(): DbConfig {
		return appConfig.db;
	}

	public get email(): EmailConfig {
		return appConfig.email;
	}

	public get thirdParty(): ThirdPartyConfig {
		return appConfig.thirdParty;
	}

	public get testDb(): TestDbConfig {
		return appConfig.testDb;
	}

	public get isTest(): boolean {
		return appConfig.isTest;
	}

	public get isSaaS(): boolean {
		return appConfig.isSaaS;
	}

	public getTypeOrmConfig(): DataSourceOptions {
		return appConfig.getTypeOrmConfig();
	}

	public validate(): void {
		appConfig.validate();
	}
}

export { appConfig, appConfig as configService };
