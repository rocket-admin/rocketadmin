import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSecretDto {
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
}
