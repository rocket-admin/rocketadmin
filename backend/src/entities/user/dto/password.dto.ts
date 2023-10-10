import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class PasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  password: string;
}
