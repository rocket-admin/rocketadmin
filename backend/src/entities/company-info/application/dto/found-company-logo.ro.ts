import { ApiProperty } from '@nestjs/swagger';

export class FoundCompanyLogoRO {
  @ApiProperty({ type: 'string', format: 'base64' })
  logo: string;
}
