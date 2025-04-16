import { FilterCriteriaEnum } from '../../../../enums/filter-criteria.enum.js';

export class DynamicTableFiltersDs {
  column_name: string;
  comparator: FilterCriteriaEnum;
}
export class CreateTableFilterDs {
  table_name: string;
  connection_id: string;
  filters: Record<string, any>;
  masterPwd: string;
  filter_name: string;
  dynamic_filtered_column: DynamicTableFiltersDs | null;
}
