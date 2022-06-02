import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class EmailDto {
  @ApiProperty()
  @IsNotEmpty()
  email: string;
}
