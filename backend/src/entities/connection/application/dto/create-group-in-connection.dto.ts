import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateGroupInConnectionDTO {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  title: string;
}
