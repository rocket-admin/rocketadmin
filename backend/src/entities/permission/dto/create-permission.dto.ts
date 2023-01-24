import { IsNotEmpty } from 'class-validator';

export class CreatePermissionDto {
  @IsNotEmpty()
  type: string;

  @IsNotEmpty()
  accessLevel: string;

  tableName?: string;

  @IsNotEmpty()
  groupId: string;
}
