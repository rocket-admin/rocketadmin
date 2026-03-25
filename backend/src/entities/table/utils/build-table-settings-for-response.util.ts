import { TableSettingsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-settings.ds.js';
import { TableSettingsInRowsDS } from '../application/data-structures/found-table-rows.ds.js';

export function buildTableSettingsForResponse(
	builtDAOsTableSettings: TableSettingsDS,
	tableSettings?: { allow_csv_export?: boolean; allow_csv_import?: boolean; can_delete?: boolean; can_update?: boolean; can_add?: boolean } | null,
): TableSettingsInRowsDS {
	return {
		sortable_by: builtDAOsTableSettings?.sortable_by?.length > 0 ? builtDAOsTableSettings.sortable_by : [],
		ordering: builtDAOsTableSettings.ordering ? builtDAOsTableSettings.ordering : undefined,
		identity_column: builtDAOsTableSettings.identity_column ? builtDAOsTableSettings.identity_column : null,
		list_fields: builtDAOsTableSettings?.list_fields?.length > 0 ? builtDAOsTableSettings.list_fields : [],
		allow_csv_export: tableSettings?.allow_csv_export ?? true,
		allow_csv_import: tableSettings?.allow_csv_import ?? true,
		can_delete: tableSettings?.can_delete ?? true,
		can_update: tableSettings?.can_update ?? true,
		can_add: tableSettings?.can_add ?? true,
		columns_view: builtDAOsTableSettings?.columns_view ? builtDAOsTableSettings.columns_view : [],
		ordering_field: builtDAOsTableSettings.ordering_field ? builtDAOsTableSettings.ordering_field : undefined,
	};
}
