import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsISO8601, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateSecretDto {
  @ApiProperty({ required: true, type: 'string' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'slug must contain only letters, numbers, hyphens, and underscores',
  })
  @Transform(({ value }) => value.trim())
  slug: string;

  @ApiProperty({ required: true, type: 'string' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(10000)
  value: string;

  @ApiProperty({ required: false, type: 'string' })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @ApiProperty({ required: false, type: 'boolean' })
  @IsBoolean()
  @IsOptional()
  masterEncryption?: boolean;

  @ApiProperty({ required: false, type: 'string' })
  @IsString()
  @IsOptional()
  @MinLength(8)
  @ValidateIf((o) => o.masterEncryption === true)
  masterPassword?: string;
}
