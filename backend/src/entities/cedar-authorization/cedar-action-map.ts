export enum CedarAction {
	ConnectionRead = 'connection:read',
	ConnectionEdit = 'connection:edit',
	GroupRead = 'group:read',
	GroupEdit = 'group:edit',
	TableRead = 'table:read',
	TableAdd = 'table:add',
	TableEdit = 'table:edit',
	TableDelete = 'table:delete',
}

export enum CedarResourceType {
	Connection = 'RocketAdmin::Connection',
	Group = 'RocketAdmin::Group',
	Table = 'RocketAdmin::Table',
}

export const CEDAR_ACTION_TYPE = 'RocketAdmin::Action';
export const CEDAR_USER_TYPE = 'RocketAdmin::User';
export const CEDAR_GROUP_TYPE = 'RocketAdmin::Group';

export interface CedarValidationRequest {
	userId: string;
	action: CedarAction;
	connectionId?: string;
	groupId?: string;
	tableName?: string;
}
