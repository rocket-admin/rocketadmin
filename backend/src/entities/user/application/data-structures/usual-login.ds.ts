import { ApiProperty } from '@nestjs/swagger';

export class UsualLoginDs {
  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;

  @ApiProperty()
  companyId: string;

  gclidValue: string;

  request_domain: string;

  ipAddress?: string;

  userAgent?: string;
}
