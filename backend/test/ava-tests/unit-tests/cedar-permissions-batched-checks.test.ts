import { ForbiddenException } from '@nestjs/common';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import test from 'ava';
import { IGlobalDatabaseContext } from '../../../src/common/application/global-database-context.interface.js';
import { CedarPermissionsService } from '../../../src/entities/cedar-authorization/cedar-permissions.service.js';
import { generateCedarPolicyForGroup } from '../../../src/entities/cedar-authorization/cedar-policy-generator.js';
import { GroupEntity } from '../../../src/entities/group/group.entity.js';
import { assertUserCanReadQueryTables } from '../../../src/entities/visualizations/panel/utils/assert-query-tables-readable.util.js';
import { AccessLevelEnum } from '../../../src/enums/access-level.enum.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';

// Every Cedar permission check loads the caller's groups in the connection (one SQL query joining
// group + connection + user). Listing endpoints used to run that check once per table or per group
// inside Promise.all, which surfaced as an "N+1 query with repeating spans" on the backend. The
// batched entry points below must answer the same verdicts as the per-item ones while loading the
// groups exactly once.

const ADMIN_USER = 'user-admin';
const LIMITED_USER = 'user-limited';
const OUTSIDER = 'user-outsider';

interface FakeGroup {
	id: string;
	connectionId: string;
	isMain: boolean;
	cedarPolicy: string | null;
	userIds: Array<string>;
}

function toEntity(group: FakeGroup): GroupEntity {
	return {
		id: group.id,
		title: group.id,
		isMain: group.isMain,
		cedarPolicy: group.cedarPolicy,
		connection: { id: group.connectionId },
		users: group.userIds.map((id) => ({ id })),
	} as unknown as GroupEntity;
}

function limitedPolicy(connectionId: string, groupId: string, tables: Array<string>): string {
	return generateCedarPolicyForGroup(connectionId, false, {
		connection: { connectionId, accessLevel: AccessLevelEnum.readonly },
		group: { groupId, accessLevel: AccessLevelEnum.readonly },
		tables: tables.map((tableName) => ({
			tableName,
			accessLevel: { visibility: true, readonly: true, add: false, delete: false, edit: false },
		})),
	});
}

function makeFixture(connectionId: string) {
	const otherConnectionId = `${connectionId}-other`;
	const groups: Array<FakeGroup> = [
		{
			id: `${connectionId}-admin`,
			connectionId,
			isMain: true,
			cedarPolicy: generateCedarPolicyForGroup(connectionId, true, {
				connection: { connectionId, accessLevel: AccessLevelEnum.edit },
				group: { groupId: `${connectionId}-admin`, accessLevel: AccessLevelEnum.edit },
				tables: [],
			}),
			userIds: [ADMIN_USER],
		},
		{
			id: `${connectionId}-limited`,
			connectionId,
			isMain: false,
			cedarPolicy: limitedPolicy(connectionId, `${connectionId}-limited`, ['orders', 'customers']),
			userIds: [LIMITED_USER],
		},
		{
			id: `${otherConnectionId}-limited`,
			connectionId: otherConnectionId,
			isMain: false,
			cedarPolicy: limitedPolicy(otherConnectionId, `${otherConnectionId}-limited`, ['invoices']),
			userIds: [LIMITED_USER],
		},
	];

	const calls = { single: 0, multi: 0, byId: 0 };
	const groupRepository = {
		findAllUserGroupsInConnection: async (connId: string, userId: string) => {
			calls.single++;
			return groups.filter((g) => g.connectionId === connId && g.userIds.includes(userId)).map(toEntity);
		},
		findAllUserGroupsInConnections: async (connIds: Array<string>, userId: string) => {
			calls.multi++;
			return groups.filter((g) => connIds.includes(g.connectionId) && g.userIds.includes(userId)).map(toEntity);
		},
		findGroupByIdWithConnectionAndUsers: async (groupId: string) => {
			calls.byId++;
			const found = groups.find((g) => g.id === groupId);
			return found ? toEntity(found) : null;
		},
	};
	const service = new CedarPermissionsService({ groupRepository } as unknown as IGlobalDatabaseContext);
	return { service, calls, groups, otherConnectionId };
}

test.beforeEach(async () => {
	await Cacher.clearAllCache();
});

test.serial('getReadableTables loads the groups once for the whole table list', async (t) => {
	const connectionId = 'conn-readable-batch';
	const { service, calls } = makeFixture(connectionId);
	const tableNames = Array.from({ length: 74 }, (_v, i) => `table_${i}`);

	const readable = await service.getReadableTables(ADMIN_USER, connectionId, tableNames);

	t.is(readable.size, 74);
	t.is(calls.single, 1);
	t.is(calls.multi, 0);
});

test.serial('getReadableTables answers exactly what improvedCheckTableRead answers per table', async (t) => {
	const connectionId = 'conn-readable-parity';
	const { service } = makeFixture(connectionId);
	const tableNames = ['orders', 'customers', 'secrets', 'orders'];

	const batched = await service.getReadableTables(LIMITED_USER, connectionId, tableNames);
	await Cacher.clearAllCache();
	const perTable = new Set<string>();
	for (const tableName of tableNames) {
		if (await service.improvedCheckTableRead(LIMITED_USER, connectionId, tableName)) perTable.add(tableName);
	}

	t.deepEqual([...batched].sort(), ['customers', 'orders']);
	t.deepEqual([...batched].sort(), [...perTable].sort());
});

test.serial('getReadableTables shares the table-read cache with improvedCheckTableRead', async (t) => {
	const connectionId = 'conn-readable-cache';
	const { service, calls } = makeFixture(connectionId);

	await service.getReadableTables(LIMITED_USER, connectionId, ['orders', 'secrets']);
	t.is(calls.single, 1);

	// Verdicts (both allow and deny) were cached: no further group lookup for the same tables.
	t.true(await service.improvedCheckTableRead(LIMITED_USER, connectionId, 'orders'));
	t.false(await service.improvedCheckTableRead(LIMITED_USER, connectionId, 'secrets'));
	t.deepEqual(await service.getReadableTables(LIMITED_USER, connectionId, ['orders', 'secrets']), new Set(['orders']));
	t.is(calls.single, 1);

	// A table never seen before costs one more lookup, not one per table.
	await service.getReadableTables(LIMITED_USER, connectionId, ['orders', 'customers', 'audit']);
	t.is(calls.single, 2);
});

test.serial('getReadableTables denies everything (and caches it) for a user with no groups', async (t) => {
	const connectionId = 'conn-readable-outsider';
	const { service, calls } = makeFixture(connectionId);

	const readable = await service.getReadableTables(OUTSIDER, connectionId, ['orders', 'customers']);

	t.is(readable.size, 0);
	t.false(await service.improvedCheckTableRead(OUTSIDER, connectionId, 'orders'));
	t.is(calls.single, 1);
});

test.serial('getGroupAccessLevels resolves every group with one lookup across connections', async (t) => {
	const connectionId = 'conn-groups-batch';
	const { service, calls, groups } = makeFixture(connectionId);
	const entities = groups.map(toEntity);

	const levels = await service.getGroupAccessLevels(LIMITED_USER, entities);

	t.is(calls.multi, 1);
	t.is(calls.single, 0);
	t.is(calls.byId, 0);
	t.is(levels.get(`${connectionId}-admin`), AccessLevelEnum.none);
	t.is(levels.get(`${connectionId}-limited`), AccessLevelEnum.readonly);
	t.is(levels.get(`${connectionId}-other-limited`), AccessLevelEnum.readonly);
});

test.serial('getGroupAccessLevels matches getGroupAccessLevel for every user and group', async (t) => {
	const connectionId = 'conn-groups-parity';
	const { service, groups } = makeFixture(connectionId);
	const entities = groups.map(toEntity);

	for (const userId of [ADMIN_USER, LIMITED_USER, OUTSIDER]) {
		const batched = await service.getGroupAccessLevels(userId, entities);
		for (const group of entities) {
			t.is(batched.get(group.id), await service.getGroupAccessLevel(userId, group.id), `${userId} / ${group.id}`);
		}
	}
});

test.serial('getGroupAccessLevels refuses groups loaded without their connection', async (t) => {
	const { service } = makeFixture('conn-groups-no-relation');
	const bare = { id: 'g1', title: 'g1', isMain: false, cedarPolicy: null } as unknown as GroupEntity;

	await t.throwsAsync(service.getGroupAccessLevels(ADMIN_USER, [bare]), { message: /without its connection/ });
});

test('assertUserCanReadQueryTables checks all referenced tables in one batch', async (t) => {
	const seen: Array<Array<string>> = [];
	await t.notThrowsAsync(
		assertUserCanReadQueryTables({
			query: 'SELECT o.id FROM orders o JOIN customers c ON c.id = o.customer_id JOIN orders o2 ON o2.id = o.id',
			connectionType: ConnectionTypesEnum.postgres,
			connectionId: 'conn-query',
			getReadableTables: async (tableNames) => {
				seen.push(tableNames);
				return new Set(tableNames);
			},
			listAllTableNames: async () => {
				throw new Error('not expected: the query names its tables');
			},
		}),
	);
	t.is(seen.length, 1);
	t.deepEqual([...seen[0]].sort(), ['customers', 'orders']);
});

test('assertUserCanReadQueryTables rejects on the first unreadable table and falls back to all tables', async (t) => {
	await t.throwsAsync(
		assertUserCanReadQueryTables({
			query: 'SELECT * FROM orders JOIN secrets ON secrets.id = orders.id',
			connectionType: ConnectionTypesEnum.postgres,
			connectionId: 'conn-query-denied',
			getReadableTables: async (tableNames) => new Set(tableNames.filter((name) => name !== 'secrets')),
			listAllTableNames: async () => [],
		}),
		{ instanceOf: ForbiddenException, message: /secrets/ },
	);

	let listed = 0;
	const seen: Array<Array<string>> = [];
	await t.notThrowsAsync(
		assertUserCanReadQueryTables({
			query: 'db.orders.find({})',
			connectionType: ConnectionTypesEnum.mongodb,
			connectionId: 'conn-query-fallback',
			getReadableTables: async (tableNames) => {
				seen.push(tableNames);
				return new Set(tableNames);
			},
			listAllTableNames: async () => {
				listed++;
				return ['a', 'b', 'a', 'c'];
			},
		}),
	);
	t.is(listed, 1);
	t.deepEqual(seen, [['a', 'b', 'c']]);
});
