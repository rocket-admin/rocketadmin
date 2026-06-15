import { GroupEntity } from '../group/group.entity.js';

export interface CedarEntityRecord {
	uid: { type: string; id: string };
	attrs: Record<string, unknown>;
	parents: Array<{ type: string; id: string }>;
}

export function buildCedarEntities(
	userId: string,
	userGroups: Array<GroupEntity>,
	connectionId: string,
	tableName?: string,
	dashboardId?: string,
	panelId?: string,
	actionEventId?: string,
	columnName?: string,
): Array<CedarEntityRecord> {
	const entities: Array<CedarEntityRecord> = [];

	// User entity with group memberships
	entities.push({
		uid: { type: 'RocketAdmin::User', id: userId },
		attrs: { suspended: false },
		parents: [],
	});

	// Group entities
	for (const group of userGroups) {
		entities.push({
			uid: { type: 'RocketAdmin::Group', id: group.id },
			attrs: {
				isMain: group.isMain,
				connectionId: connectionId,
			},
			parents: [],
		});
	}

	// Connection entity
	entities.push({
		uid: { type: 'RocketAdmin::Connection', id: connectionId },
		attrs: {},
		parents: [],
	});

	// Table entity (if table-level check, or as parent for an ActionEvent)
	if (tableName) {
		entities.push({
			uid: { type: 'RocketAdmin::Table', id: `${connectionId}/${tableName}` },
			attrs: { connectionId: connectionId },
			parents: [{ type: 'RocketAdmin::Connection', id: connectionId }],
		});
	}

	// Column entity, parented by its Table — required so `resource in Table::"..."`
	// policies authorize reading any column without naming each one (the table:read alias).
	if (columnName && tableName) {
		entities.push({
			uid: { type: 'RocketAdmin::Column', id: `${connectionId}/${tableName}/${columnName}` },
			attrs: { connectionId: connectionId, tableName: tableName },
			parents: [{ type: 'RocketAdmin::Table', id: `${connectionId}/${tableName}` }],
		});
	}

	// ActionEvent entity, parented by its Table — required so `resource in Table::"..."`
	// policies authorize triggering specific events without naming each event.
	if (actionEventId && tableName) {
		entities.push({
			uid: { type: 'RocketAdmin::ActionEvent', id: `${connectionId}/${tableName}/${actionEventId}` },
			attrs: { connectionId: connectionId, tableName: tableName },
			parents: [{ type: 'RocketAdmin::Table', id: `${connectionId}/${tableName}` }],
		});
	}

	if (dashboardId) {
		entities.push({
			uid: { type: 'RocketAdmin::Dashboard', id: `${connectionId}/${dashboardId}` },
			attrs: { connectionId: connectionId },
			parents: [{ type: 'RocketAdmin::Connection', id: connectionId }],
		});
	}

	if (panelId) {
		entities.push({
			uid: { type: 'RocketAdmin::Panel', id: `${connectionId}/${panelId}` },
			attrs: { connectionId: connectionId },
			parents: [{ type: 'RocketAdmin::Connection', id: connectionId }],
		});
	}

	return entities;
}
