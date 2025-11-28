import { ApiProperty } from '@nestjs/swagger';
import { SignInMethodEnum } from '../enums/sign-in-method.enum.js';
import { SignInStatusEnum } from '../enums/sign-in-status.enum.js';

export class FoundSignInAuditRecordDs {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: SignInStatusEnum })
  status: SignInStatusEnum;

  @ApiProperty({ enum: SignInMethodEnum })
  signInMethod: SignInMethodEnum;

  @ApiProperty()
  ipAddress: string;

  @ApiProperty()
  userAgent: string;

  @ApiProperty()
  failureReason: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  userId: string;
}
