import { ApiProperty } from '@nestjs/swagger';

export class VerifyCompanyInvitationRequestDto {
  @ApiProperty()
  password: string;

  @ApiProperty()
  userName: string;
}
