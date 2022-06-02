import { QueryOrderingEnum } from '../../enums';

export interface ITableSettings {
  id: string;
  table_name: string;
  display_name: string;
  connection_id: string;
  search_fields: string[];
  excluded_fields: string[];
  list_fields: string[];
  list_per_page: number;
  ordering: QueryOrderingEnum;
  ordering_field: string;
  readonly_fields: string[];
  sortable_by: string[];
}
