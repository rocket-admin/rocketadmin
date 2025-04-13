export class CreateTableFiltersDto {
  table_name: string;
  connection_id: string;
  filters: Record<string, any>;
  masterPwd: string;
}
