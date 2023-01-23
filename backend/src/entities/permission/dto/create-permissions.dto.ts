import { IsNotEmpty } from 'class-validator';

export class CreatePermissionsDto {
  @IsNotEmpty()
  connection: {};

  @IsNotEmpty()
  group: {};

  tables: {};
}
