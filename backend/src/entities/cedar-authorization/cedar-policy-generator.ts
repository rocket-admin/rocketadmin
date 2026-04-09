import { AccessLevelEnum } from '../../enums/index.js';
import { IComplexPermission } from '../permission/permission.interface.js';

export function generateCedarPolicyForGroup(
	connectionId: string,
	isMain: boolean,
	permissions: IComplexPermission,
): string {
	const policies: Array<string> = [];
	const connectionRef = `RocketAdmin::Connection::"${connectionId}"`;

	if (isMain) {
		policies.push(
			`permit(\n  principal,\n  action,\n  resource\n);`,
		);
		return policies.join('\n\n');
	}

	// Connection permissions
	const connAccess = permissions.connection.accessLevel;
	if (connAccess === AccessLevelEnum.edit) {
		policies.push(
			`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == ${connectionRef}\n);`,
		);
		policies.push(
			`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:edit",\n  resource == ${connectionRef}\n);`,
		);
	} else if (connAccess === AccessLevelEnum.readonly) {
		policies.push(
			`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == ${connectionRef}\n);`,
		);
	}

	// Group permissions
	const groupAccess = permissions.group.accessLevel;
	const groupResourceRef = `RocketAdmin::Group::"${permissions.group.groupId}"`;
	if (groupAccess === AccessLevelEnum.edit) {
		policies.push(
			`permit(\n  principal,\n  action == RocketAdmin::Action::"group:read",\n  resource == ${groupResourceRef}\n);`,
		);
		policies.push(
			`permit(\n  principal,\n  action == RocketAdmin::Action::"group:edit",\n  resource == ${groupResourceRef}\n);`,
		);
	} else if (groupAccess === AccessLevelEnum.readonly) {
		policies.push(
			`permit(\n  principal,\n  action == RocketAdmin::Action::"group:read",\n  resource == ${groupResourceRef}\n);`,
		);
	}

	if (permissions.dashboards) {
		let hasCreatePermission = false;
		let hasReadPermission = false;
		for (const dashboard of permissions.dashboards) {
			const dashboardRef = `RocketAdmin::Dashboard::"${connectionId}/${dashboard.dashboardId}"`;
			const access = dashboard.accessLevel;

			if (access.read) {
				hasReadPermission = true;
				policies.push(
					`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:read",\n  resource == ${dashboardRef}\n);`,
				);
			}
			if (access.create) {
				hasCreatePermission = true;
			}
			if (access.edit) {
				policies.push(
					`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:edit",\n  resource == ${dashboardRef}\n);`,
				);
			}
			if (access.delete) {
				policies.push(
					`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:delete",\n  resource == ${dashboardRef}\n);`,
				);
			}
		}
		const newDashboardRef = `RocketAdmin::Dashboard::"${connectionId}/__new__"`;
		if (hasReadPermission) {
			policies.push(
				`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:read",\n  resource == ${newDashboardRef}\n);`,
			);
		}
		if (hasCreatePermission) {
			policies.push(
				`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:create",\n  resource == ${newDashboardRef}\n);`,
			);
		}
	}

	if (permissions.panels) {
		let hasPanelCreatePermission = false;
		let hasPanelReadPermission = false;
		for (const panel of permissions.panels) {
			const panelRef = `RocketAdmin::Panel::"${connectionId}/${panel.panelId}"`;
			const access = panel.accessLevel;

			if (access.read) {
				hasPanelReadPermission = true;
				policies.push(
					`permit(\n  principal,\n  action == RocketAdmin::Action::"panel:read",\n  resource == ${panelRef}\n);`,
				);
			}
			if (access.create) {
				hasPanelCreatePermission = true;
			}
			if (access.edit) {
				policies.push(
					`permit(\n  principal,\n  action == RocketAdmin::Action::"panel:edit",\n  resource == ${panelRef}\n);`,
				);
			}
			if (access.delete) {
				policies.push(
					`permit(\n  principal,\n  action == RocketAdmin::Action::"panel:delete",\n  resource == ${panelRef}\n);`,
				);
			}
		}
		const newPanelRef = `RocketAdmin::Panel::"${connectionId}/__new__"`;
		if (hasPanelReadPermission) {
			policies.push(
				`permit(\n  principal,\n  action == RocketAdmin::Action::"panel:read",\n  resource == ${newPanelRef}\n);`,
			);
		}
		if (hasPanelCreatePermission) {
			policies.push(
				`permit(\n  principal,\n  action == RocketAdmin::Action::"panel:create",\n  resource == ${newPanelRef}\n);`,
			);
		}
	}

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
