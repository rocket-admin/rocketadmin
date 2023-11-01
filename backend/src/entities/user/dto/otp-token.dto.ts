import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class OtpTokenDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(12)
  otpToken: string;
}
