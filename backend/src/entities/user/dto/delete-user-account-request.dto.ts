import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DeleteUserAccountDTO {
  @ApiProperty()
  @IsOptional()
  @IsString()
  reason: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  message: string;
}
