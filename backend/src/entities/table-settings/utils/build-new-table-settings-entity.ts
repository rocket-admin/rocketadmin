import { ConnectionEntity } from '../../connection/connection.entity.js';
import { CreateTableSettingsDs } from '../application/data-structures/create-table-settings.ds.js';
import { TableSettingsEntity } from '../table-settings.entity.js';

export function buildNewTableSettingsEntity(
  settings: CreateTableSettingsDs,
  connection: ConnectionEntity,
): TableSettingsEntity {
  const newSettings = new TableSettingsEntity();
  const {
    autocomplete_columns,
    columns_view,
    custom_fields,
    display_name,
    excluded_fields,
    identification_fields,
    identity_column,
    list_fields,
    list_per_page,
    ordering,
    ordering_field,
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
  } = settings;
  newSettings.connection_id = connection;
  newSettings.display_name = display_name;
  newSettings.table_name = table_name;
  newSettings.search_fields = search_fields;
  newSettings.excluded_fields = excluded_fields;
  newSettings.list_fields = list_fields;
  newSettings.list_per_page = list_per_page;
  newSettings.ordering = ordering;
  newSettings.ordering_field = ordering_field;
  newSettings.readonly_fields = readonly_fields;
  newSettings.sortable_by = sortable_by;
  newSettings.autocomplete_columns = autocomplete_columns;
  newSettings.custom_fields = custom_fields;
  newSettings.table_widgets = table_widgets;
  newSettings.identification_fields = identification_fields;
  newSettings.sensitive_fields = sensitive_fields;
  newSettings.columns_view = columns_view;
  newSettings.identity_column = identity_column;
  newSettings.table_actions = table_actions;
  newSettings.can_add = can_add;
  newSettings.can_delete = can_delete;
  newSettings.can_update = can_update;
  return newSettings;
}
