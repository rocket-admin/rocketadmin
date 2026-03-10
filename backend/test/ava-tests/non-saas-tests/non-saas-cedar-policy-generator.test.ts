import test from 'ava';
import { generateCedarPolicyForGroup } from '../../../src/entities/cedar-authorization/cedar-policy-generator.js';
import { AccessLevelEnum } from '../../../src/enums/index.js';
import { IComplexPermission } from '../../../src/entities/permission/permission.interface.js';

const groupId = 'test-group-id';
const connectionId = 'test-connection-id';

function makePermissions(overrides: Partial<IComplexPermission> = {}): IComplexPermission {
	return {
		connection: { connectionId, accessLevel: AccessLevelEnum.none },
		group: { groupId, accessLevel: AccessLevelEnum.none },
		tables: [],
		...overrides,
	};
}

test('isMain=true generates a single wildcard permit', (t) => {
	const result = generateCedarPolicyForGroup(groupId, connectionId, true, makePermissions());
	t.true(result.includes('principal in RocketAdmin::Group::"test-group-id"'));
	t.true(result.includes('action,'));
	t.true(result.includes('resource'));
	// Should be a single policy
	const permits = result.match(/permit\(/g);
	t.is(permits.length, 1);
});

test('connection:edit generates ONLY connection:read + connection:edit (not wildcard)', (t) => {
	const result = generateCedarPolicyForGroup(
		groupId,
		connectionId,
		false,
		makePermissions({
			connection: { connectionId, accessLevel: AccessLevelEnum.edit },
		}),
	);
	t.true(result.includes('action == RocketAdmin::Action::"connection:read"'));
	t.true(result.includes('action == RocketAdmin::Action::"connection:edit"'));
	// Must NOT contain wildcard `action,` on its own line (which would grant table access)
	t.false(result.includes('action,\n  resource\n'));
	// Must NOT contain table actions
	t.false(result.includes('table:read'));
	t.false(result.includes('table:add'));
	t.false(result.includes('table:edit'));
	t.false(result.includes('table:delete'));
	const permits = result.match(/permit\(/g);
	t.is(permits.length, 2);
});

test('connection:readonly generates only connection:read', (t) => {
	const result = generateCedarPolicyForGroup(
		groupId,
		connectionId,
		false,
		makePermissions({
			connection: { connectionId, accessLevel: AccessLevelEnum.readonly },
		}),
	);
	t.true(result.includes('action == RocketAdmin::Action::"connection:read"'));
	t.false(result.includes('connection:edit'));
	const permits = result.match(/permit\(/g);
	t.is(permits.length, 1);
});

test('connection:none generates no connection policies', (t) => {
	const result = generateCedarPolicyForGroup(groupId, connectionId, false, makePermissions());
	t.false(result.includes('connection:read'));
	t.false(result.includes('connection:edit'));
});

test('group:edit generates group:read + group:edit', (t) => {
	const result = generateCedarPolicyForGroup(
		groupId,
		connectionId,
		false,
		makePermissions({
			group: { groupId, accessLevel: AccessLevelEnum.edit },
		}),
	);
	t.true(result.includes('action == RocketAdmin::Action::"group:read"'));
	t.true(result.includes('action == RocketAdmin::Action::"group:edit"'));
	const permits = result.match(/permit\(/g);
	t.is(permits.length, 2);
});

test('group:readonly generates only group:read', (t) => {
	const result = generateCedarPolicyForGroup(
		groupId,
		connectionId,
		false,
		makePermissions({
			group: { groupId, accessLevel: AccessLevelEnum.readonly },
		}),
	);
	t.true(result.includes('action == RocketAdmin::Action::"group:read"'));
	t.false(result.includes('group:edit'));
	const permits = result.match(/permit\(/g);
	t.is(permits.length, 1);
});

test('table with visibility=true only generates only table:read', (t) => {
	const result = generateCedarPolicyForGroup(
		groupId,
		connectionId,
		false,
		makePermissions({
			tables: [
				{
					tableName: 'users',
					accessLevel: { visibility: true, readonly: false, add: false, delete: false, edit: false },
				},
			],
		}),
	);
	t.true(result.includes('action == RocketAdmin::Action::"table:read"'));
	t.false(result.includes('table:add'));
	t.false(result.includes('table:edit'));
	t.false(result.includes('table:delete'));
	const permits = result.match(/permit\(/g);
	t.is(permits.length, 1);
});

test('table with all flags true generates table:read + table:add + table:edit + table:delete', (t) => {
	const result = generateCedarPolicyForGroup(
		groupId,
		connectionId,
		false,
		makePermissions({
			tables: [
				{
					tableName: 'users',
					accessLevel: { visibility: true, readonly: false, add: true, delete: true, edit: true },
				},
			],
		}),
	);
	t.true(result.includes('table:read'));
	t.true(result.includes('table:add'));
	t.true(result.includes('table:edit'));
	t.true(result.includes('table:delete'));
	const permits = result.match(/permit\(/g);
	t.is(permits.length, 4);
});

test('table with add=true only generates table:read + table:add (hasAnyAccess triggers table:read)', (t) => {
	const result = generateCedarPolicyForGroup(
		groupId,
		connectionId,
		false,
		makePermissions({
			tables: [
				{
					tableName: 'users',
					accessLevel: { visibility: false, readonly: false, add: true, delete: false, edit: false },
				},
			],
		}),
	);
	t.true(result.includes('table:read'));
	t.true(result.includes('table:add'));
	t.false(result.includes('table:edit'));
	t.false(result.includes('table:delete'));
	const permits = result.match(/permit\(/g);
	t.is(permits.length, 2);
});

test('table with all flags false generates no policies for that table', (t) => {
	const result = generateCedarPolicyForGroup(
		groupId,
		connectionId,
		false,
		makePermissions({
			tables: [
				{
					tableName: 'users',
					accessLevel: { visibility: false, readonly: false, add: false, delete: false, edit: false },
				},
			],
		}),
	);
	t.false(result.includes('table:'));
	t.is(result, '');
});

test('all none + no tables returns empty string', (t) => {
	const result = generateCedarPolicyForGroup(groupId, connectionId, false, makePermissions());
	t.is(result, '');
});

test('multiple tables generate separate policies per table with correct resource refs', (t) => {
	const result = generateCedarPolicyForGroup(
		groupId,
		connectionId,
		false,
		makePermissions({
			tables: [
				{
					tableName: 'users',
					accessLevel: { visibility: true, readonly: false, add: false, delete: false, edit: false },
				},
				{
					tableName: 'orders',
					accessLevel: { visibility: true, readonly: false, add: true, delete: false, edit: false },
				},
			],
		}),
	);
	t.true(result.includes(`RocketAdmin::Table::"${connectionId}/users"`));
	t.true(result.includes(`RocketAdmin::Table::"${connectionId}/orders"`));
	// users: table:read only; orders: table:read + table:add
	const permits = result.match(/permit\(/g);
	t.is(permits.length, 3);
});

test('resource ref format validation', (t) => {
	const result = generateCedarPolicyForGroup(
		groupId,
		connectionId,
		false,
		makePermissions({
			connection: { connectionId, accessLevel: AccessLevelEnum.edit },
			group: { groupId, accessLevel: AccessLevelEnum.edit },
			tables: [
				{
					tableName: 'users',
					accessLevel: { visibility: true, readonly: false, add: false, delete: false, edit: false },
				},
			],
		}),
	);
	t.true(result.includes(`RocketAdmin::Group::"${groupId}"`));
	t.true(result.includes(`RocketAdmin::Connection::"${connectionId}"`));
	t.true(result.includes(`RocketAdmin::Table::"${connectionId}/users"`));
});
