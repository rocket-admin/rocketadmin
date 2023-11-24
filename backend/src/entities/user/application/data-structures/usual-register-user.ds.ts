import { ApiProperty } from '@nestjs/swagger';
import { UserRoleEnum } from '../../enums/user-role.enum.js';

export class UsualRegisterUserDs {
  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;

  @ApiProperty()
  gclidValue: string;

  @ApiProperty()
  name: string;
}

export class SaasUsualUserRegisterDS extends UsualRegisterUserDs {
  @ApiProperty({ required: false })
  companyId?: string;

  @ApiProperty({ required: false, enum: UserRoleEnum })
  userRole?: UserRoleEnum;

  @ApiProperty({ required: false })
  companyName?: string;
}

export class RegisterInvitedUserDS {
  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  companyId: string;
}
