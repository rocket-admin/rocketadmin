import { IsNotEmpty } from 'class-validator';
import { PermissionEntity } from '../../permission/permission.entity.js';
import { UserEntity } from '../../user/user.entity.js';

export class CreateGroupDto {
  @IsNotEmpty()
  title: string;

  permissions?: Array<PermissionEntity>;

  isMain?: boolean;

  users?: Array<UserEntity>;
}
