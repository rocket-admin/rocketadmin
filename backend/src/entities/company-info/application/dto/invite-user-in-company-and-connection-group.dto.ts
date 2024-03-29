import { ApiProperty } from '@nestjs/swagger';
import { UserRoleEnum } from '../../../user/enums/user-role.enum.js';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class InviteUserInCompanyAndConnectionGroupDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty()
  groupId: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty()
  email: string;

  @IsNotEmpty()
  @IsEnum(UserRoleEnum)
  @ApiProperty({ enum: UserRoleEnum })
  role: UserRoleEnum;
}
