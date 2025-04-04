import { ApiProperty } from '@nestjs/swagger';
export class FoundCompanyLogoInfo {
  @ApiProperty({ type: 'string', format: 'base64' })
  image: string;

  @ApiProperty({ type: 'string' })
  mimeType: string;
}

export class FoundCompanyLogoRO {
  @ApiProperty({ type: FoundCompanyLogoInfo })
  logo: FoundCompanyLogoInfo;
}
