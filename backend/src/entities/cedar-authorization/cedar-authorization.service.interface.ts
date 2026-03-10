import { IComplexPermission } from '../permission/permission.interface.js';
import { CedarValidationRequest } from './cedar-action-map.js';

export interface ICedarAuthorizationService {
	isFeatureEnabled(): boolean;
	validate(request: CedarValidationRequest): Promise<boolean>;
	invalidatePolicyCacheForConnection(connectionId: string): void;
	getSchema(): Record<string, unknown>;
	validateCedarSchema(schema: Record<string, unknown>): void;
	saveCedarPolicy(
		connectionId: string,
		groupId: string,
		cedarPolicy: string,
	): Promise<{ cedarPolicy: string; classicalPermissions: IComplexPermission }>;
}
