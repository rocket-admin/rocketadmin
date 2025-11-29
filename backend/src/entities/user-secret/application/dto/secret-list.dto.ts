import { ApiProperty } from '@nestjs/swagger';

export class SecretListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  slug: string;

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

export class SecretListResponseDto {
  @ApiProperty({ type: [SecretListItemDto] })
  data: SecretListItemDto[];

  @ApiProperty()
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
