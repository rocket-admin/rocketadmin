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
): Array<CedarEntityRecord> {
	const entities: Array<CedarEntityRecord> = [];

	// User entity with group memberships
	entities.push({
		uid: { type: 'RocketAdmin::User', id: userId },
		attrs: { suspended: false },
		parents: userGroups.map((g) => ({ type: 'RocketAdmin::Group', id: g.id })),
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

	// Table entity (if table-level check)
	if (tableName) {
		entities.push({
			uid: { type: 'RocketAdmin::Table', id: `${connectionId}/${tableName}` },
			attrs: { connectionId: connectionId },
			parents: [{ type: 'RocketAdmin::Connection', id: connectionId }],
		});
	}

	return entities;
}
