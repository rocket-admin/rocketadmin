import { ValidateTableSettingsDS } from '../../data-access-layer/shared/data-structures/validate-table-settings.ds.js';
import { IUnknownDataStructure } from '../../data-access-layer/shared/interfaces/unknown-datastructure.interface.js';
import { buildTableWidgetDs } from './table-widget-ds.builder.js';

export function buildValidateTableSettingsDS(tableSettings: IUnknownDataStructure): ValidateTableSettingsDS {
  return {
    connection_id: tableSettings.connection_id,
    table_name: tableSettings.table_name,
    display_name: tableSettings.display_name,
    search_fields: tableSettings.search_fields,
    excluded_fields: tableSettings.excluded_fields,
    list_fields: tableSettings.list_fields,
    identification_fields: tableSettings.identification_fields,
    list_per_page: tableSettings.list_per_page,
    ordering: tableSettings.ordering,
    ordering_field: tableSettings.ordering_field,
    identity_column: tableSettings.identity_column,
    readonly_fields: tableSettings.readonly_fields,
    sortable_by: tableSettings.sortable_by,
    autocomplete_columns: tableSettings.autocomplete_columns,
    custom_fields: tableSettings.custom_fields,
    table_widgets: tableSettings.table_widgets
      ? tableSettings.table_widgets.map((widget: IUnknownDataStructure) => buildTableWidgetDs(widget))
      : null,
    columns_view: tableSettings.columns_view,
  };
}
