import { appConfig } from '../../shared/config/app-config.js';

export function isTest(): boolean {
	return appConfig.isTest;
}
