import test from 'ava';
import { buildCedarEntities } from '../../../src/entities/cedar-authorization/cedar-entity-builder.js';
import { GroupEntity } from '../../../src/entities/group/group.entity.js';

const userId = 'test-user-id';
const connectionId = 'test-connection-id';

function makeGroup(id: string, isMain: boolean): GroupEntity {
	return { id, isMain } as unknown as GroupEntity;
}

test('user entity has correct type, id, suspended=false, and group parents', (t) => {
	const groups = [makeGroup('g1', false), makeGroup('g2', true)];
	const entities = buildCedarEntities(userId, groups, connectionId);
	const userEntity = entities.find((e) => e.uid.type === 'RocketAdmin::User');
	t.truthy(userEntity);
	t.is(userEntity.uid.id, userId);
	t.is(userEntity.attrs.suspended, false);
	t.is(userEntity.parents.length, 2);
	t.deepEqual(userEntity.parents[0], { type: 'RocketAdmin::Group', id: 'g1' });
	t.deepEqual(userEntity.parents[1], { type: 'RocketAdmin::Group', id: 'g2' });
});

test('group entities have correct type, isMain attribute, connectionId attribute, empty parents', (t) => {
	const groups = [makeGroup('g1', false), makeGroup('g2', true)];
	const entities = buildCedarEntities(userId, groups, connectionId);
	const groupEntities = entities.filter((e) => e.uid.type === 'RocketAdmin::Group');
	t.is(groupEntities.length, 2);

	const g1 = groupEntities.find((e) => e.uid.id === 'g1');
	t.is(g1.attrs.isMain, false);
	t.is(g1.attrs.connectionId, connectionId);
	t.deepEqual(g1.parents, []);

	const g2 = groupEntities.find((e) => e.uid.id === 'g2');
	t.is(g2.attrs.isMain, true);
	t.is(g2.attrs.connectionId, connectionId);
	t.deepEqual(g2.parents, []);
});

test('connection entity has correct type, id, empty attrs and parents', (t) => {
	const entities = buildCedarEntities(userId, [makeGroup('g1', false)], connectionId);
	const connEntity = entities.find((e) => e.uid.type === 'RocketAdmin::Connection');
	t.truthy(connEntity);
	t.is(connEntity.uid.id, connectionId);
	t.deepEqual(connEntity.attrs, {});
	t.deepEqual(connEntity.parents, []);
});

test('table entity created when tableName provided with correct id and parent', (t) => {
	const tableName = 'users';
	const entities = buildCedarEntities(userId, [makeGroup('g1', false)], connectionId, tableName);
	const tableEntity = entities.find((e) => e.uid.type === 'RocketAdmin::Table');
	t.truthy(tableEntity);
	t.is(tableEntity.uid.id, `${connectionId}/${tableName}`);
	t.is(tableEntity.attrs.connectionId, connectionId);
	t.deepEqual(tableEntity.parents, [{ type: 'RocketAdmin::Connection', id: connectionId }]);
});

test('no table entity when tableName omitted', (t) => {
	const entities = buildCedarEntities(userId, [makeGroup('g1', false)], connectionId);
	const tableEntity = entities.find((e) => e.uid.type === 'RocketAdmin::Table');
	t.falsy(tableEntity);
});

test('correct total entity count for various inputs', (t) => {
	// 1 user + 2 groups + 1 connection = 4 (no table)
	const entities1 = buildCedarEntities(userId, [makeGroup('g1', false), makeGroup('g2', true)], connectionId);
	t.is(entities1.length, 4);

	// 1 user + 1 group + 1 connection + 1 table = 4
	const entities2 = buildCedarEntities(userId, [makeGroup('g1', false)], connectionId, 'users');
	t.is(entities2.length, 4);

	// 1 user + 0 groups + 1 connection = 2
	const entities3 = buildCedarEntities(userId, [], connectionId);
	t.is(entities3.length, 2);
});

test('empty groups array means user has no parents', (t) => {
	const entities = buildCedarEntities(userId, [], connectionId);
	const userEntity = entities.find((e) => e.uid.type === 'RocketAdmin::User');
	t.truthy(userEntity);
	t.deepEqual(userEntity.parents, []);
});
