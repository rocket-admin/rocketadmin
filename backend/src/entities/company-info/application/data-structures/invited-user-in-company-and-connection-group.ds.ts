import { ApiProperty } from '@nestjs/swagger';
import { UserRoleEnum } from '../../../user/enums/user-role.enum.js';

export class InvitedUserInCompanyAndConnectionGroupDs {
  @ApiProperty()
  companyId: string;

  @ApiProperty()
  groupId: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: UserRoleEnum })
  role: UserRoleEnum;
}
