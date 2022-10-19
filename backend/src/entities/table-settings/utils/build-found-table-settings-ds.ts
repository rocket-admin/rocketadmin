import { ConnectionEntity } from '../../connection/connection.entity';
import { FoundTableSettingsDs } from '../application/data-structures/found-table-settings.ds';
import { TableSettingsEntity } from '../table-settings.entity';

export function buildFoundTableSettingsDs(tableSettings: TableSettingsEntity): FoundTableSettingsDs {
  const {
    id,
    table_name,
    display_name,
    search_fields,
    excluded_fields,
    list_fields,
    identification_fields,
    list_per_page,
    ordering,
    ordering_field,
    identity_column,
    readonly_fields,
    sortable_by,
    autocomplete_columns,
    columns_view,
    custom_fields,
    table_widgets,
    table_actions,
  } = tableSettings;
  let connection_id = tableSettings.connection_id as unknown;
  if (connection_id instanceof ConnectionEntity) {
    connection_id = connection_id.id;
  }
  return {
    id: id,
    table_name: table_name,
    display_name: display_name,
    search_fields: search_fields,
    excluded_fields: excluded_fields,
    list_fields: list_fields,
    identification_fields: identification_fields,
    list_per_page: list_per_page,
    ordering: ordering,
    ordering_field: ordering_field,
    identity_column: identity_column,
    readonly_fields: readonly_fields,
    sortable_by: sortable_by,
    autocomplete_columns: autocomplete_columns,
    columns_view: columns_view,
    connection_id: connection_id as unknown as string,
    custom_fields: custom_fields,
    table_widgets: table_widgets,
    table_actions: table_actions,
  };
}
