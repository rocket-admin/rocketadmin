import { ApiProperty } from '@nestjs/swagger';
export class FoundCompanyImageInfo {
  @ApiProperty({ type: 'string', format: 'base64' })
  image: string;

  @ApiProperty({ type: 'string' })
  mimeType: string;
}

export class FoundCompanyLogoRO {
  @ApiProperty({ type: FoundCompanyImageInfo })
  logo: FoundCompanyImageInfo;
}

export class FoundCompanyFaviconRO {
  @ApiProperty({ type: FoundCompanyImageInfo })
  favicon: FoundCompanyImageInfo;
}
