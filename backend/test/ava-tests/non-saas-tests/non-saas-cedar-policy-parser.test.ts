import test from 'ava';
import { parseCedarPolicyToClassicalPermissions } from '../../../src/entities/cedar-authorization/cedar-policy-parser.js';
import { AccessLevelEnum } from '../../../src/enums/index.js';

const groupId = 'test-group-id';
const connectionId = 'test-connection-id';

test('parses connection:read into readonly access', (t) => {
	const policy = `permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`;

	const result = parseCedarPolicyToClassicalPermissions(policy, connectionId, groupId);
	t.is(result.connection.accessLevel, AccessLevelEnum.readonly);
	t.is(result.connection.connectionId, connectionId);
});

test('parses connection:read + connection:edit into edit access', (t) => {
	const policy = [
		`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
		`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:edit",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
	].join('\n\n');

	const result = parseCedarPolicyToClassicalPermissions(policy, connectionId, groupId);
	t.is(result.connection.accessLevel, AccessLevelEnum.edit);
});

test('parses group:read into readonly access', (t) => {
	const policy = `permit(\n  principal,\n  action == RocketAdmin::Action::"group:read",\n  resource == RocketAdmin::Group::"${groupId}"\n);`;

	const result = parseCedarPolicyToClassicalPermissions(policy, connectionId, groupId);
	t.is(result.group.accessLevel, AccessLevelEnum.readonly);
	t.is(result.group.groupId, groupId);
});

test('parses group:read + group:edit into edit access', (t) => {
	const policy = [
		`permit(\n  principal,\n  action == RocketAdmin::Action::"group:read",\n  resource == RocketAdmin::Group::"${groupId}"\n);`,
		`permit(\n  principal,\n  action == RocketAdmin::Action::"group:edit",\n  resource == RocketAdmin::Group::"${groupId}"\n);`,
	].join('\n\n');

	const result = parseCedarPolicyToClassicalPermissions(policy, connectionId, groupId);
	t.is(result.group.accessLevel, AccessLevelEnum.edit);
});

test('parses table:read into visibility + readonly', (t) => {
	const policy = `permit(\n  principal,\n  action == RocketAdmin::Action::"table:read",\n  resource == RocketAdmin::Table::"${connectionId}/users"\n);`;

	const result = parseCedarPolicyToClassicalPermissions(policy, connectionId, groupId);
	t.is(result.tables.length, 1);
	t.is(result.tables[0].tableName, 'users');
	t.is(result.tables[0].accessLevel.visibility, true);
	t.is(result.tables[0].accessLevel.readonly, true);
	t.is(result.tables[0].accessLevel.add, false);
	t.is(result.tables[0].accessLevel.edit, false);
	t.is(result.tables[0].accessLevel.delete, false);
});

test('parses table:read + table:add + table:edit + table:delete into full access', (t) => {
	const policy = [
		`permit(\n  principal,\n  action == RocketAdmin::Action::"table:read",\n  resource == RocketAdmin::Table::"${connectionId}/users"\n);`,
		`permit(\n  principal,\n  action == RocketAdmin::Action::"table:add",\n  resource == RocketAdmin::Table::"${connectionId}/users"\n);`,
		`permit(\n  principal,\n  action == RocketAdmin::Action::"table:edit",\n  resource == RocketAdmin::Table::"${connectionId}/users"\n);`,
		`permit(\n  principal,\n  action == RocketAdmin::Action::"table:delete",\n  resource == RocketAdmin::Table::"${connectionId}/users"\n);`,
	].join('\n\n');

	const result = parseCedarPolicyToClassicalPermissions(policy, connectionId, groupId);
	t.is(result.tables.length, 1);
	t.is(result.tables[0].accessLevel.visibility, true);
	t.is(result.tables[0].accessLevel.readonly, true);
	t.is(result.tables[0].accessLevel.add, true);
	t.is(result.tables[0].accessLevel.edit, true);
	t.is(result.tables[0].accessLevel.delete, true);
});

test('parses multiple tables separately', (t) => {
	const policy = [
		`permit(\n  principal,\n  action == RocketAdmin::Action::"table:read",\n  resource == RocketAdmin::Table::"${connectionId}/users"\n);`,
		`permit(\n  principal,\n  action == RocketAdmin::Action::"table:read",\n  resource == RocketAdmin::Table::"${connectionId}/orders"\n);`,
		`permit(\n  principal,\n  action == RocketAdmin::Action::"table:add",\n  resource == RocketAdmin::Table::"${connectionId}/orders"\n);`,
	].join('\n\n');

	const result = parseCedarPolicyToClassicalPermissions(policy, connectionId, groupId);
	t.is(result.tables.length, 2);

	const usersTable = result.tables.find((t) => t.tableName === 'users');
	const ordersTable = result.tables.find((t) => t.tableName === 'orders');
	t.truthy(usersTable);
	t.truthy(ordersTable);
	t.is(usersTable.accessLevel.add, false);
	t.is(ordersTable.accessLevel.add, true);
});

test('parses dashboard permissions', (t) => {
	const policy = [
		`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:read",\n  resource == RocketAdmin::Dashboard::"${connectionId}/dash-1"\n);`,
		`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:create",\n  resource == RocketAdmin::Dashboard::"${connectionId}/dash-1"\n);`,
		`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:edit",\n  resource == RocketAdmin::Dashboard::"${connectionId}/dash-1"\n);`,
		`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:delete",\n  resource == RocketAdmin::Dashboard::"${connectionId}/dash-1"\n);`,
	].join('\n\n');

	const result = parseCedarPolicyToClassicalPermissions(policy, connectionId, groupId);
	t.is(result.dashboards.length, 1);
	t.is(result.dashboards[0].dashboardId, 'dash-1');
	t.is(result.dashboards[0].accessLevel.read, true);
	t.is(result.dashboards[0].accessLevel.create, true);
	t.is(result.dashboards[0].accessLevel.edit, true);
	t.is(result.dashboards[0].accessLevel.delete, true);
});

test('parses wildcard policy (isMain) into full connection + group access', (t) => {
	const policy = `permit(\n  principal,\n  action,\n  resource\n);`;

	const result = parseCedarPolicyToClassicalPermissions(policy, connectionId, groupId);
	t.is(result.connection.accessLevel, AccessLevelEnum.edit);
	t.is(result.group.accessLevel, AccessLevelEnum.edit);
});

test('empty policy returns all none permissions', (t) => {
	const result = parseCedarPolicyToClassicalPermissions('', connectionId, groupId);
	t.is(result.connection.accessLevel, AccessLevelEnum.none);
	t.is(result.group.accessLevel, AccessLevelEnum.none);
	t.is(result.tables.length, 0);
	t.is(result.dashboards.length, 0);
});

test('complex policy with connection + group + table + dashboard permissions', (t) => {
	const policy = [
		`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
		`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:edit",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
		`permit(\n  principal,\n  action == RocketAdmin::Action::"group:read",\n  resource == RocketAdmin::Group::"${groupId}"\n);`,
		`permit(\n  principal,\n  action == RocketAdmin::Action::"table:read",\n  resource == RocketAdmin::Table::"${connectionId}/users"\n);`,
		`permit(\n  principal,\n  action == RocketAdmin::Action::"table:add",\n  resource == RocketAdmin::Table::"${connectionId}/users"\n);`,
		`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:read",\n  resource == RocketAdmin::Dashboard::"${connectionId}/dash-1"\n);`,
	].join('\n\n');

	const result = parseCedarPolicyToClassicalPermissions(policy, connectionId, groupId);
	t.is(result.connection.accessLevel, AccessLevelEnum.edit);
	t.is(result.group.accessLevel, AccessLevelEnum.readonly);
	t.is(result.tables.length, 1);
	t.is(result.tables[0].tableName, 'users');
	t.is(result.tables[0].accessLevel.add, true);
	t.is(result.tables[0].accessLevel.edit, false);
	t.is(result.dashboards.length, 1);
	t.is(result.dashboards[0].dashboardId, 'dash-1');
	t.is(result.dashboards[0].accessLevel.read, true);
	t.is(result.dashboards[0].accessLevel.create, false);
});
