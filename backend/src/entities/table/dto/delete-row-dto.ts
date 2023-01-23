export class DeleteRowDto {
  tableName: string;

  primaryColumn: Record<string, unknown>;
}
