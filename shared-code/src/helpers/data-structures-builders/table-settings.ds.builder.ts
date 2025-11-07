import { TableSettingsDS } from '../../data-access-layer/shared/data-structures/table-settings.ds.js';
import { QueryOrderingEnum } from '../../data-access-layer/shared/enums/query-ordering.enum.js';

type CommonTableSettingsInput = {
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
};

type PersonalTableSettingsInput = {
  ordering: QueryOrderingEnum;
  ordering_field: string;
  list_per_page: number;
  list_fields: string[];
};

export function buildDAOsTableSettingsDs(
  commonTableSettings: CommonTableSettingsInput | null,
  personalTableSettings: PersonalTableSettingsInput | null,
): TableSettingsDS {
  return {
    table_name: commonTableSettings?.table_name,
    display_name: commonTableSettings?.display_name,
    search_fields: commonTableSettings?.search_fields,
    excluded_fields: commonTableSettings?.excluded_fields,
    list_fields: personalTableSettings?.list_fields || [],
    identification_fields: commonTableSettings?.identification_fields,
    list_per_page: personalTableSettings?.list_per_page,
    ordering: personalTableSettings?.ordering,
    ordering_field: personalTableSettings?.ordering_field,
    identity_column: commonTableSettings?.identity_column,
    readonly_fields: commonTableSettings?.readonly_fields,
    sortable_by: commonTableSettings?.sortable_by,
    autocomplete_columns: commonTableSettings?.autocomplete_columns,
    columns_view: commonTableSettings?.columns_view,
    can_delete: commonTableSettings?.can_delete,
    can_update: commonTableSettings?.can_update,
    can_add: commonTableSettings?.can_add,
    sensitive_fields: commonTableSettings?.sensitive_fields,
  };
}
