import { ApiProperty } from '@nestjs/swagger';
import { UserRoleEnum } from '../../../user/enums/user-role.enum.js';

export class FoundInvitationInCompanyDs {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false })
  verification_string: string | null;

  @ApiProperty({ required: false })
  groupId: string | null;

  @ApiProperty({ required: false })
  inviterId: string | null;

  @ApiProperty({ required: false })
  invitedUserEmail: string | null;

  @ApiProperty({ enum: UserRoleEnum })
  role: UserRoleEnum;

  @ApiProperty()
  createdAt: Date;
}
