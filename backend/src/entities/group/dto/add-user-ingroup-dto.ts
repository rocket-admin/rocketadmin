import { ApiProperty } from '@nestjs/swagger';
import { UserRoleEnum } from '../../user/enums/user-role.enum.js';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AddUserInGroupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  groupId: string;

  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  companyId: string;

  @ApiProperty({ enum: UserRoleEnum })
  @IsOptional()
  @IsNotEmpty()
  @IsEnum(UserRoleEnum)
  role: UserRoleEnum;
}
