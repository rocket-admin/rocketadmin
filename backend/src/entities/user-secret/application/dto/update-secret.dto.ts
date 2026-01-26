import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSecretDto {
  @ApiProperty({
    type: String,
    required: true,
    description: 'The new secret value (will be encrypted)',
    example: 'my-updated-secret-value-456',
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
    description: 'ISO 8601 date when the secret should expire (null to remove expiration)',
    example: '2025-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
