import { AccessLevelEnum } from '../../enums/index.js';

export interface IComplexPermission {
	connection: IConnectionPermissionData;
	group: IGroupPermissionData;
	tables: Array<ITablePermissionData>;
	dashboards?: Array<IDashboardPermissionData>;
}

export interface IConnectionPermissionData {
	connectionId: string;
	accessLevel: AccessLevelEnum;
}

export interface IGroupPermissionData {
	groupId: string;
	accessLevel: AccessLevelEnum;
}

export interface ITableAccessLevel {
	visibility: boolean;
	readonly: boolean;
	add: boolean;
	delete: boolean;
	edit: boolean;
}

export interface ITablePermissionData {
	tableName: string;
	accessLevel: ITableAccessLevel;
}

export interface ITableAndViewPermissionData extends ITablePermissionData {
	isView: boolean;
}

export interface IDashboardAccessLevel {
	read: boolean;
	create: boolean;
	edit: boolean;
	delete: boolean;
}

export interface IDashboardPermissionData {
	dashboardId: string;
	accessLevel: IDashboardAccessLevel;
}
