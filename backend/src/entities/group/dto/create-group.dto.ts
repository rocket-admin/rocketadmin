import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { PermissionEntity } from '../../permission/permission.entity';
import { UserEntity } from '../../user/user.entity';

export class CreateGroupDto {
  @ApiProperty()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  permissions?: Array<PermissionEntity>;

  isMain?: boolean;

  @ApiProperty()
  users?: Array<UserEntity>;
}
