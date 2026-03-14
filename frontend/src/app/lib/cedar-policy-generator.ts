import { AccessLevel, Permissions } from '../models/user';

export function generateCedarPolicy(connectionId: string, permissions: Permissions): string {
	const policies: string[] = [];
	const connectionRef = `RocketAdmin::Connection::"${connectionId}"`;

	// Connection full access → wildcard policy (grants everything)
	const connAccess = permissions.connection.accessLevel;
	if (connAccess === AccessLevel.Edit) {
		policies.push(`permit(\n  principal,\n  action,\n  resource\n);`);
		return policies.join('\n\n');
	}

	if (connAccess === AccessLevel.Readonly) {
		policies.push(
			`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == ${connectionRef}\n);`,
		);
	}

	// Group permissions
	const groupAccess = permissions.group.accessLevel;
	const groupResourceRef = `RocketAdmin::Group::"${permissions.group.groupId}"`;
	if (groupAccess === AccessLevel.Edit) {
		policies.push(
			`permit(\n  principal,\n  action == RocketAdmin::Action::"group:read",\n  resource == ${groupResourceRef}\n);`,
		);
		policies.push(
			`permit(\n  principal,\n  action == RocketAdmin::Action::"group:edit",\n  resource == ${groupResourceRef}\n);`,
		);
	} else if (groupAccess === AccessLevel.Readonly) {
		policies.push(
			`permit(\n  principal,\n  action == RocketAdmin::Action::"group:read",\n  resource == ${groupResourceRef}\n);`,
		);
	}

	// Table permissions
	for (const table of permissions.tables) {
		const tableRef = `RocketAdmin::Table::"${connectionId}/${table.tableName}"`;
		const access = table.accessLevel;

		const hasAnyAccess = access.visibility || access.add || access.delete || access.edit;
		if (hasAnyAccess) {
			policies.push(
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:read",\n  resource == ${tableRef}\n);`,
			);
		}
		if (access.add) {
			policies.push(
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:add",\n  resource == ${tableRef}\n);`,
			);
		}
		if (access.edit) {
			policies.push(
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:edit",\n  resource == ${tableRef}\n);`,
			);
		}
		if (access.delete) {
			policies.push(
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:delete",\n  resource == ${tableRef}\n);`,
			);
		}
	}

	return policies.join('\n\n');
}
