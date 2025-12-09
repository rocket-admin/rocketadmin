import { ApiProperty } from '@nestjs/swagger';

export class SaasRegisterUserWithGithub {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  githubId: number;

  @ApiProperty()
  glidCookieValue: string;

  @ApiProperty({ required: false })
  ipAddress?: string;

  @ApiProperty({ required: false })
  userAgent?: string;
}
