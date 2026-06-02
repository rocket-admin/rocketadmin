import { QueryOrderingEnum } from '../../../enums/query-ordering.enum.js';
import { TableSettingsEntity } from '../../table-settings/common-table-settings/table-settings.entity.js';

export type CommonTableSettingsInput = {
	table_name: string;
	display_name: string;
	search_fields: string[];
	excluded_fields: string[];
	identification_fields: string[];
	identity_column: string;
	readonly_fields: string[];
	sortable_by: string[];
	autocomplete_columns: string[];
	columns_view: string[];
	can_delete: boolean;
	can_update: boolean;
	can_add: boolean;
	sensitive_fields: string[];
	ordering: QueryOrderingEnum;
	ordering_field: string;
	list_per_page: number;
	list_fields: string[];
};

export function buildCommonTableSettingsInput(
	tableSettings: TableSettingsEntity | null | undefined,
): CommonTableSettingsInput | null {
	if (!tableSettings) {
		return null;
	}
	return {
		table_name: tableSettings.table_name,
		display_name: tableSettings.display_name ?? '',
		search_fields: tableSettings.search_fields ?? [],
		excluded_fields: tableSettings.excluded_fields ?? [],
		identification_fields: tableSettings.identification_fields ?? [],
		identity_column: tableSettings.identity_column ?? '',
		readonly_fields: tableSettings.readonly_fields ?? [],
		sortable_by: tableSettings.sortable_by ?? [],
		autocomplete_columns: tableSettings.autocomplete_columns ?? [],
		columns_view: tableSettings.columns_view ?? [],
		can_delete: tableSettings.can_delete,
		can_update: tableSettings.can_update,
		can_add: tableSettings.can_add,
		sensitive_fields: tableSettings.sensitive_fields ?? [],
		ordering: tableSettings.ordering,
		ordering_field: tableSettings.ordering_field ?? '',
		list_per_page: tableSettings.list_per_page ?? 0,
		list_fields: tableSettings.list_fields ?? [],
	};
}
