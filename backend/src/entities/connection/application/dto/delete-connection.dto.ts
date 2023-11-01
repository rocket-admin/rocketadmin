import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DeleteConnectionReasonDto {
  @IsOptional()
  @IsString()
  @ApiProperty()
  reason: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  message: string;
}
