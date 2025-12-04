import { ApiProperty } from '@nestjs/swagger';

export class SecretListItemDto {
  @ApiProperty({
    type: String,
    description: 'Unique identifier of the secret',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    type: String,
    description: 'Unique slug identifier for the secret',
    example: 'database-password',
  })
  slug: string;

  @ApiProperty({
    type: String,
    description: 'Company ID that owns this secret',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  companyId: string;

  @ApiProperty({
    type: Date,
    description: 'Date when the secret was created',
    example: '2025-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: Date,
    description: 'Date when the secret was last updated',
    example: '2025-01-20T14:45:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    type: Date,
    required: false,
    description: 'Date when the secret was last accessed',
    example: '2025-01-25T09:15:00.000Z',
  })
  lastAccessedAt?: Date;

  @ApiProperty({
    type: Date,
    required: false,
    description: 'Date when the secret expires (null if no expiration)',
    example: '2025-12-31T23:59:59.000Z',
  })
  expiresAt?: Date;

  @ApiProperty({
    type: Boolean,
    description: 'Whether the secret requires a master password for decryption',
    example: false,
  })
  masterEncryption: boolean;
}

export class PaginationDto {
  @ApiProperty({
    type: Number,
    description: 'Total number of items',
    example: 42,
  })
  total: number;

  @ApiProperty({
    type: Number,
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    type: Number,
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    type: Number,
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;
}

export class SecretListResponseDto {
  @ApiProperty({
    type: [SecretListItemDto],
    description: 'List of secrets',
  })
  data: SecretListItemDto[];

  @ApiProperty({
    type: PaginationDto,
    description: 'Pagination information',
  })
  pagination: PaginationDto;
}
