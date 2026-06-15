export enum CedarAction {
	ConnectionRead = 'connection:read',
	ConnectionEdit = 'connection:edit',
	ConnectionDiagram = 'connection:diagram',
	GroupRead = 'group:read',
	GroupEdit = 'group:edit',
	TableRead = 'table:read',
	TableQuery = 'table:query',
	ColumnRead = 'column:read',
	TableAdd = 'table:add',
	TableEdit = 'table:edit',
	TableDelete = 'table:delete',
	TableAiRequest = 'table:ai-request',
	ActionEventTrigger = 'actionEvent:trigger',
	DashboardRead = 'dashboard:read',
	DashboardCreate = 'dashboard:create',
	DashboardEdit = 'dashboard:edit',
	DashboardDelete = 'dashboard:delete',
	PanelRead = 'panel:read',
	PanelCreate = 'panel:create',
	PanelEdit = 'panel:edit',
	PanelDelete = 'panel:delete',
}

export enum CedarResourceType {
	Connection = 'RocketAdmin::Connection',
	Group = 'RocketAdmin::Group',
	Table = 'RocketAdmin::Table',
	Column = 'RocketAdmin::Column',
	ActionEvent = 'RocketAdmin::ActionEvent',
	Dashboard = 'RocketAdmin::Dashboard',
	Panel = 'RocketAdmin::Panel',
}

export const CEDAR_ACTION_TYPE = 'RocketAdmin::Action';
export const CEDAR_USER_TYPE = 'RocketAdmin::User';
export const CEDAR_GROUP_TYPE = 'RocketAdmin::Group';

export const ACTION_EVENT_PROBE_ID = '__probe__';

export const COLUMN_PROBE_ID = '__probe__';

export interface CedarValidationRequest {
	userId: string;
	action: CedarAction;
	connectionId?: string;
	groupId?: string;
	tableName?: string;
	columnName?: string;
	actionEventId?: string;
	dashboardId?: string;
	panelId?: string;
}
