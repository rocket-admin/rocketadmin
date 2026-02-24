export interface ICedarAuthorizationService {
	isFeatureEnabled(): boolean;

	checkConnectionRead(userId: string, connectionId: string): Promise<boolean>;
	checkConnectionEdit(userId: string, connectionId: string): Promise<boolean>;

	checkGroupRead(userId: string, groupId: string): Promise<boolean>;
	checkGroupEdit(userId: string, groupId: string): Promise<boolean>;

	checkTableRead(userId: string, connectionId: string, tableName: string): Promise<boolean>;
	checkTableAdd(userId: string, connectionId: string, tableName: string): Promise<boolean>;
	checkTableEdit(userId: string, connectionId: string, tableName: string): Promise<boolean>;
	checkTableDelete(userId: string, connectionId: string, tableName: string): Promise<boolean>;

	invalidatePolicyCacheForConnection(connectionId: string): void;
}
