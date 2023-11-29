import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsString, IsUUID, ValidateNested } from 'class-validator';
import { UserRoleEnum } from '../../../user/enums/user-role.enum.js';

export class UpdateUserRoleRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum({ enum: UserRoleEnum })
  role: UserRoleEnum;
}

export class UpdateUsersRolesRequestDto {
  @ApiProperty({ type: UpdateUserRoleRequestDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  users: Array<UpdateUserRoleRequestDto>;
}
