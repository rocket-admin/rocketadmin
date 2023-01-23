import { IsNotEmpty } from 'class-validator';

export class CreatePermissionsDto {
  @IsNotEmpty()
  connection: Record<string, unknown>;

  @IsNotEmpty()
  group: Record<string, unknown>;

  tables: Record<string, unknown>;
}
