import { QueryOrderingEnum } from '../../../../enums/query-ordering.enum.js';
import { ConnectionEntity } from '../../../connection/connection.entity.js';
import { CreateTableSettingsDs } from '../../application/data-structures/create-table-settings.ds.js';
import { TableSettingsEntity } from '../table-settings.entity.js';

export function buildNewTableSettingsEntity(
	settings: CreateTableSettingsDs,
	connection: ConnectionEntity,
): TableSettingsEntity {
	const newSettings = new TableSettingsEntity();
	const {
		autocomplete_columns,
		custom_fields,
		display_name,
		excluded_fields,
		identification_fields,
		identity_column,
		readonly_fields,
		search_fields,
		sortable_by,
		table_name,
		table_widgets,
		table_actions,
		sensitive_fields,
		can_add,
		can_delete,
		can_update,
		icon,
		allow_csv_export,
		allow_csv_import,
		list_per_page,
		list_fields,
		ordering,
		ordering_field,
		columns_view,
	} = settings;
	newSettings.connection_id = connection;
	newSettings.display_name = display_name ?? null;
	newSettings.table_name = table_name;
	newSettings.search_fields = search_fields ?? [];
	newSettings.excluded_fields = excluded_fields ?? [];
	newSettings.readonly_fields = readonly_fields ?? [];
	newSettings.sortable_by = sortable_by ?? [];
	newSettings.autocomplete_columns = autocomplete_columns ?? [];
	newSettings.custom_fields = custom_fields ?? [];
	newSettings.table_widgets = table_widgets ?? [];
	newSettings.identification_fields = identification_fields ?? [];
	newSettings.sensitive_fields = sensitive_fields ?? null;
	newSettings.identity_column = identity_column ?? null;
	newSettings.table_actions = table_actions ?? [];
	newSettings.can_add = can_add ?? true;
	newSettings.can_delete = can_delete ?? true;
	newSettings.can_update = can_update ?? true;
	newSettings.icon = icon ?? null;
	newSettings.allow_csv_export = allow_csv_export;
	newSettings.allow_csv_import = allow_csv_import;
	newSettings.list_per_page = list_per_page ?? null;
	newSettings.list_fields = list_fields ?? [];
	newSettings.ordering = ordering as QueryOrderingEnum;
	newSettings.ordering_field = ordering_field ?? null;
	newSettings.columns_view = columns_view ?? null;
	return newSettings;
}
