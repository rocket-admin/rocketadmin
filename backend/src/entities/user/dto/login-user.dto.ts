import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class LoginUserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  readonly email: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  readonly password: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsUUID()
  readonly companyId: string;
}
