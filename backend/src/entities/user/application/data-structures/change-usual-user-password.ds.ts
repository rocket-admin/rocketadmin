import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail, IsStrongPassword, MaxLength } from 'class-validator';

export class ChangeUsualUserPasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0,
  })
  newPassword: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  oldPassword: string;
}

export class ChangeUsualUserPasswordDs extends ChangeUsualUserPasswordDto {
  userId: string;
}