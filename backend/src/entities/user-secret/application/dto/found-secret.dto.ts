import { ApiProperty } from '@nestjs/swagger';

export class FoundSecretDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ required: false })
  value?: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  lastAccessedAt?: Date;

  @ApiProperty({ required: false })
  expiresAt?: Date;

  @ApiProperty()
  masterEncryption: boolean;
}
