import { AccessLevelEnum } from '../../enums/index.js';
import { IComplexPermission } from '../permission/permission.interface.js';

export function generateCedarPolicyForGroup(
	groupId: string,
	connectionId: string,
	isMain: boolean,
	permissions: IComplexPermission,
): string {
	const policies: Array<string> = [];
	const groupRef = `RocketAdmin::Group::"${groupId}"`;
	const connectionRef = `RocketAdmin::Connection::"${connectionId}"`;

	if (isMain) {
		policies.push(
			`permit(\n  principal in ${groupRef},\n  action,\n  resource\n);`,
		);
		return policies.join('\n\n');
	}

	// Connection permissions
	const connAccess = permissions.connection.accessLevel;
	if (connAccess === AccessLevelEnum.edit) {
		policies.push(
			`permit(\n  principal in ${groupRef},\n  action == RocketAdmin::Action::"connection:read",\n  resource == ${connectionRef}\n);`,
		);
		policies.push(
			`permit(\n  principal in ${groupRef},\n  action == RocketAdmin::Action::"connection:edit",\n  resource == ${connectionRef}\n);`,
		);
	} else if (connAccess === AccessLevelEnum.readonly) {
		policies.push(
			`permit(\n  principal in ${groupRef},\n  action == RocketAdmin::Action::"connection:read",\n  resource == ${connectionRef}\n);`,
		);
	}

	// Group permissions
	const groupAccess = permissions.group.accessLevel;
	const groupResourceRef = `RocketAdmin::Group::"${permissions.group.groupId}"`;
	if (groupAccess === AccessLevelEnum.edit) {
		policies.push(
			`permit(\n  principal in ${groupRef},\n  action == RocketAdmin::Action::"group:read",\n  resource == ${groupResourceRef}\n);`,
		);
		policies.push(
			`permit(\n  principal in ${groupRef},\n  action == RocketAdmin::Action::"group:edit",\n  resource == ${groupResourceRef}\n);`,
		);
	} else if (groupAccess === AccessLevelEnum.readonly) {
		policies.push(
			`permit(\n  principal in ${groupRef},\n  action == RocketAdmin::Action::"group:read",\n  resource == ${groupResourceRef}\n);`,
		);
	}

	// Table permissions
	for (const table of permissions.tables) {
		const tableRef = `RocketAdmin::Table::"${connectionId}/${table.tableName}"`;
		const access = table.accessLevel;

		const hasAnyAccess = access.visibility || access.add || access.delete || access.edit;
		if (hasAnyAccess) {
			policies.push(
				`permit(\n  principal in ${groupRef},\n  action == RocketAdmin::Action::"table:read",\n  resource == ${tableRef}\n);`,
			);
		}
		if (access.add) {
			policies.push(
				`permit(\n  principal in ${groupRef},\n  action == RocketAdmin::Action::"table:add",\n  resource == ${tableRef}\n);`,
			);
		}
		if (access.edit) {
			policies.push(
				`permit(\n  principal in ${groupRef},\n  action == RocketAdmin::Action::"table:edit",\n  resource == ${tableRef}\n);`,
			);
		}
		if (access.delete) {
			policies.push(
				`permit(\n  principal in ${groupRef},\n  action == RocketAdmin::Action::"table:delete",\n  resource == ${tableRef}\n);`,
			);
		}
	}

	return policies.join('\n\n');
}
