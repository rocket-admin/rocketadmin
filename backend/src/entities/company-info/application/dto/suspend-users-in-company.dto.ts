import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SuspendUsersInCompanyDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsEmail({}, { each: true })
  usersEmails: Array<string>;
}
