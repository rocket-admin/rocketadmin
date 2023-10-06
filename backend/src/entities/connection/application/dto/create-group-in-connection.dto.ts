import { PermissionEntity } from '../../../permission/permission.entity.js';
import { UserEntity } from '../../../user/user.entity.js';

export class CreateGroupInConnectionDto {
  title: string;

  permissions?: Array<PermissionEntity>;

  users?: Array<UserEntity>;
}
