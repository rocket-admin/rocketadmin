import { ApiProperty } from '@nestjs/swagger';

export class RegisterCompanyWebhookDS {
  @ApiProperty()
  companyId: string;

  @ApiProperty()
  registrarUserId: string;
}
