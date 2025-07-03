import { ApiProperty } from '@nestjs/swagger';

export class SaasSAMLUserRegisterDS {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  samlConfigId: string;

  @ApiProperty()
  samlNameId: string;

  @ApiProperty({ required: false })
  samlAttributes?: Record<string, any>;
}
