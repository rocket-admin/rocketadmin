import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class SocialNetworkLoginDto {
  @ApiProperty()
  @IsNotEmpty()
  token: string;
}
