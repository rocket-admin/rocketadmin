import { ReferencedTableNamesAndColumnsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/referenced-table-names-columns.ds.js';
import { CedarPermissionsService } from '../../cedar-authorization/cedar-permissions.service.js';
import { ReferencedTableNamesAndColumnsDs } from '../table-datastructures.js';

export async function filterReferencedTablesByPermission(
	referencedTables: Array<ReferencedTableNamesAndColumnsDS>,
	userId: string,
	connectionId: string,
	masterPwd: string,
	cedarPermissions: CedarPermissionsService,
): Promise<void> {
	await Promise.all(
		referencedTables.map(async (referencedTable) => {
			referencedTable.referenced_by = (
				await Promise.all(
					referencedTable.referenced_by.map(async (ref) => {
						const canRead = await cedarPermissions.improvedCheckTableRead(
							userId,
							connectionId,
							ref.table_name,
							masterPwd,
						);
						return canRead ? ref : null;
					}),
				)
			).filter(Boolean);
		}),
	);
}

export async function enrichReferencedTablesWithDisplayNames(
	referencedTables: Array<ReferencedTableNamesAndColumnsDS>,
	connectionId: string,
	findTableSettings: (connectionId: string, tableName: string) => Promise<{ display_name?: string } | null>,
): Promise<Array<ReferencedTableNamesAndColumnsDs>> {
	const allTableNames = new Set<string>();
	for (const rt of referencedTables) {
		for (const ref of rt.referenced_by) {
			allTableNames.add(ref.table_name);
		}
	}

	const settingsEntries = await Promise.all(
		Array.from(allTableNames).map(async (tableName) => {
			const settings = await findTableSettings(connectionId, tableName);
			return [tableName, settings?.display_name || null] as const;
		}),
	);
	const displayNameMap = new Map(settingsEntries);

	return referencedTables.map((el) => ({
		referenced_on_column_name: el.referenced_on_column_name,
		referenced_by: el.referenced_by.map((ref) => ({
			...ref,
			display_name: displayNameMap.get(ref.table_name) || null,
		})),
	}));
}
