import { DynamicTableFiltersDs } from './create-table-filters.ds.js';

export class UpdateTableFilterDs {
  filter_id: string;
  connection_id: string;
  filters: Record<string, any>;
  masterPwd: string;
  filter_name: string;
  dynamic_filtered_column: DynamicTableFiltersDs | null;
}
