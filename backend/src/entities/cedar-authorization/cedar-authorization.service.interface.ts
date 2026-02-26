import { CedarValidationRequest } from './cedar-action-map.js';

export interface ICedarAuthorizationService {
	isFeatureEnabled(): boolean;
	validate(request: CedarValidationRequest): Promise<boolean>;
	invalidatePolicyCacheForConnection(connectionId: string): void;
}
