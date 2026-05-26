import { appConfig } from '../../shared/config/app-config.js';

export function isSaaS(): boolean {
	return appConfig.isSaaS;
}
