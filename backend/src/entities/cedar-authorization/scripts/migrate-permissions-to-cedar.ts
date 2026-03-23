import { DataSource } from 'typeorm';
import { AccessLevelEnum, PermissionTypeEnum } from '../../../enums/index.js';
import { GroupEntity } from '../../group/group.entity.js';
import { IComplexPermission, ITablePermissionData } from '../../permission/permission.interface.js';
import { generateCedarPolicyForGroup } from '../cedar-policy-generator.js';

export async function migratePermissionsToCedar(dataSource: DataSource): Promise<void> {
	const groupRepository = dataSource.getRepository(GroupEntity);
	let migratedCount = 0;

	const permissionTableExists = await dataSource
		.query(
			`SELECT EXISTS (
				SELECT FROM information_schema.tables
				WHERE table_name = 'permission'
			) AS "exists"`,
		)
		.then((rows: Array<{ exists: boolean }>) => rows[0]?.exists === true);

	if (!permissionTableExists) {
		console.log('Permission tables already removed — skipping legacy migration');
		return;
	}

	const groups = await groupRepository
		.createQueryBuilder('group')
		.leftJoinAndSelect('group.connection', 'connection')
		.where('group.cedarPolicy IS NULL OR group.cedarPolicy = :empty OR group.cedarPolicy LIKE :oldFormat', {
			empty: '',
			oldFormat: '%principal in RocketAdmin::Group%',
		})
		.getMany();

	for (const group of groups) {
		const connection = group.connection;
		if (!connection) continue;

		const permissions: Array<{ type: string; accessLevel: string; tableName: string }> = await dataSource.query(
			`SELECT p.type, p."accessLevel", p."tableName"
			 FROM permission p
			 INNER JOIN permission_groups_group pg ON pg."permissionId" = p.id
			 WHERE pg."groupId" = $1`,
			[group.id],
		);

		const connectionPermission = permissions.find((p) => p.type === PermissionTypeEnum.Connection);
		const groupPermission = permissions.find((p) => p.type === PermissionTypeEnum.Group);
		const tablePermissions = permissions.filter((p) => p.type === PermissionTypeEnum.Table);

		const tableMap = new Map<string, ITablePermissionData>();
		for (const tp of tablePermissions) {
			const existing = tableMap.get(tp.tableName) || {
				tableName: tp.tableName,
				accessLevel: { visibility: false, readonly: false, add: false, delete: false, edit: false },
			};
			const level = tp.accessLevel as keyof ITablePermissionData['accessLevel'];
			if (level in existing.accessLevel) {
				existing.accessLevel[level] = true;
			}
			tableMap.set(tp.tableName, existing);
		}

		const complexPermission: IComplexPermission = {
			connection: {
				connectionId: connection.id,
				accessLevel: (connectionPermission?.accessLevel as AccessLevelEnum) || AccessLevelEnum.none,
			},
			group: {
				groupId: group.id,
				accessLevel: (groupPermission?.accessLevel as AccessLevelEnum) || AccessLevelEnum.none,
			},
			tables: Array.from(tableMap.values()),
		};

		const cedarPolicy = generateCedarPolicyForGroup(connection.id, group.isMain, complexPermission);
		group.cedarPolicy = cedarPolicy;
		await groupRepository.save(group);
		migratedCount++;
	}

	console.log(`Migrated Cedar policies for ${migratedCount} groups (skipped groups with existing policies)`);
}
