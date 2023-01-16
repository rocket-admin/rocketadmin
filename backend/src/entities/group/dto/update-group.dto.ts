import { ApiProperty } from '@nestjs/swagger';
import { PermissionEntity } from '../../permission/permission.entity.js';
import { UserEntity } from '../../user/user.entity.js';

export class UpdateGroupDto {
  @ApiProperty()
  title?: string;

  @ApiProperty()
  permissions?: Array<PermissionEntity>;

  @ApiProperty()
  users?: Array<UserEntity>;
}
