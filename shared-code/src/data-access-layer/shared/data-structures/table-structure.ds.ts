export class TableStructureDS {
  allow_null: boolean;
  character_maximum_length: number | null;
  column_default: string | null;
  column_name: string;
  data_type: string;
  data_type_params: string;
  udt_name: string;
  extra?: string;
}
