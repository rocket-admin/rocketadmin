import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDS {
  userId: string;

  @ApiProperty()
  otpToken: string;

  ipAddress?: string;

  userAgent?: string;
}
