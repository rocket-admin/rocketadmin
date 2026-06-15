import { AccessLevelEnum } from '../../enums/access-level.enum.js';

export interface IComplexPermission {
	connection: IConnectionPermissionData;
	group: IGroupPermissionData;
	tables: Array<ITablePermissionData>;
	actionEvents?: Array<IActionEventPermissionData>;
	dashboards?: Array<IDashboardPermissionData>;
	panels?: Array<IPanelPermissionData>;
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
	aiRequest?: boolean;
	triggerCustomAction?: boolean;
}

export interface ITablePermissionData {
	tableName: string;
	accessLevel: ITableAccessLevel;
	// Whitelist of columns the user may read. Undefined/empty ⇒ all columns readable
	// (the table:read alias = QueryTable + ColumnRead(table, *)).
	readableColumns?: Array<string>;
}

export interface ITableAndViewPermissionData extends ITablePermissionData {
	isView: boolean;
}

export interface IActionEventAccessLevel {
	trigger: boolean;
}

export interface IActionEventPermissionData {
	eventId: string;
	tableName: string;
	accessLevel: IActionEventAccessLevel;
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

export interface IPanelAccessLevel {
	read: boolean;
	create: boolean;
	edit: boolean;
	delete: boolean;
}

export interface IPanelPermissionData {
	panelId: string;
	accessLevel: IPanelAccessLevel;
}
