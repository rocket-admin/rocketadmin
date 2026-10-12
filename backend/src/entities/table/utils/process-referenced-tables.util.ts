import { ReferencedTableNamesAndColumnsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/referenced-table-names-columns.ds.js';
import { CedarPermissionsService } from '../../cedar-authorization/cedar-permissions.service.js';
import { ReferencedTableNamesAndColumnsDs } from '../table-datastructures.js';

export async function filterReferencedTablesByPermission(
	referencedTables: Array<ReferencedTableNamesAndColumnsDS>,
	userId: string,
	connectionId: string,
	_masterPwd: string,
	cedarPermissions: CedarPermissionsService,
): Promise<void> {
	const readableTables = await cedarPermissions.getReadableTables(
		userId,
		connectionId,
		referencedTables.flatMap((referencedTable) => referencedTable.referenced_by.map((ref) => ref.table_name)),
	);
	for (const referencedTable of referencedTables) {
		referencedTable.referenced_by = referencedTable.referenced_by.filter((ref) => readableTables.has(ref.table_name));
	}
}

export async function enrichReferencedTablesWithDisplayNames(
	referencedTables: Array<ReferencedTableNamesAndColumnsDS>,
	connectionId: string,
	findTableSettings: (connectionId: string, tableName: string) => Promise<{ display_name?: string | null } | null>,
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
