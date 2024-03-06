export class GetTableRowsDs {
  connectionId: string;
  masterPwd: string;
  page: number;
  perPage: number;
  query: Record<string, any>;
  searchingFieldValue: string;
  tableName: string;
  userId: string;
  filters?: Record<string, unknown>;
}
