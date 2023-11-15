import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserNameDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}
