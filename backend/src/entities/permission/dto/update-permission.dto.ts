import { IsNotEmpty } from 'class-validator';

export class UpdatePermissionDto {
  @IsNotEmpty()
  type: string;

  @IsNotEmpty()
  accessLevel: string;

  tableName?: string;

  @IsNotEmpty()
  groupId: string;

  @IsNotEmpty()
  permissionId: string;
}
