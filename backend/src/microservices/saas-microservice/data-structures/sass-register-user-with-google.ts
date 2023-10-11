import { ApiProperty } from '@nestjs/swagger';

export class SaasRegisterUserWithGoogleDS {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  glidCookieValue: string;
}
