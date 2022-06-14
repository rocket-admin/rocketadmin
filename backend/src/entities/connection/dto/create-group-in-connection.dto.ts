import { ApiProperty } from '@nestjs/swagger';
import { PermissionEntity } from '../../permission/permission.entity';
import { UserEntity } from '../../user/user.entity';

export class CreateGroupInConnectionDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  permissions?: Array<PermissionEntity>;

  @ApiProperty()
  users?: Array<UserEntity>;
}
