import { ApiProperty } from '@nestjs/swagger';
import { UserRoleEnum } from '../../user/enums/user-role.enum.js';

export class AddUserIngroupDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  groupId: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty({ enum: UserRoleEnum })
  role: UserRoleEnum;
}
