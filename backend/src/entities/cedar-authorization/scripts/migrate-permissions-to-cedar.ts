import { DataSource } from 'typeorm';
import { AccessLevelEnum, PermissionTypeEnum } from '../../../enums/index.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { GroupEntity } from '../../group/group.entity.js';
import { PermissionEntity } from '../../permission/permission.entity.js';
import { IComplexPermission, ITablePermissionData } from '../../permission/permission.interface.js';
import { generateCedarPolicyForGroup } from '../cedar-policy-generator.js';

export async function migratePermissionsToCedar(dataSource: DataSource): Promise<void> {
	const connectionRepository = dataSource.getRepository(ConnectionEntity);
	const groupRepository = dataSource.getRepository(GroupEntity);
	const permissionRepository = dataSource.getRepository(PermissionEntity);

	const connections = await connectionRepository.find();
	let migratedCount = 0;

	for (const connection of connections) {
		const groups = await groupRepository
			.createQueryBuilder('group')
			.leftJoinAndSelect('group.connection', 'connection')
			.leftJoinAndSelect('group.permissions', 'permission')
			.where('connection.id = :connectionId', { connectionId: connection.id })
			.getMany();

		for (const group of groups) {
			const permissions = group.permissions || [];

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

			const cedarPolicy = generateCedarPolicyForGroup(group.id, connection.id, group.isMain, complexPermission);
			group.cedarPolicy = cedarPolicy;
			await groupRepository.save(group);
			migratedCount++;
		}
	}

	console.log(`Migrated Cedar policies for ${migratedCount} groups`);
}
