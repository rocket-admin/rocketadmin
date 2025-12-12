import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsISO8601, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateSecretDto {
  @ApiProperty({
    type: String,
    required: true,
    description: 'Unique identifier for the secret within the company',
    example: 'database-password',
    minLength: 1,
    maxLength: 255,
    pattern: '^[a-zA-Z0-9_-]+$',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'slug must contain only letters, numbers, hyphens, and underscores',
  })
  @Transform(({ value }) => value.trim())
  slug: string;

  @ApiProperty({
    type: String,
    required: true,
    description: 'The secret value to be stored (will be encrypted)',
    example: 'my-secret-value-123',
    minLength: 1,
    maxLength: 10000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(10000)
  value: string;

  @ApiProperty({
    type: String,
    required: false,
    description: 'ISO 8601 date when the secret should expire',
    example: '2025-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @ApiProperty({
    type: Boolean,
    required: false,
    default: false,
    description: 'Whether to encrypt the secret with a master password',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  masterEncryption?: boolean;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Master password for additional encryption (required if masterEncryption is true)',
    example: 'master-password-123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @ValidateIf((o) => o.masterEncryption === true)
  masterPassword?: string;
}
