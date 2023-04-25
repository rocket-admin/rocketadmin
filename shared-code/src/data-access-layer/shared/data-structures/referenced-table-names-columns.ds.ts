export class ReferencedTableNamesAndColumnsDS {
  referenced_by: Array<{ table_name: string; column_name: string }>;
  referenced_on_column_name: string;
}
