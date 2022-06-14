import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePermissionDto {
  @ApiProperty()
  @IsNotEmpty()
  type: string;

  @ApiProperty()
  @IsNotEmpty()
  accessLevel: string;

  @ApiProperty()
  tableName?: string;

  @ApiProperty()
  @IsNotEmpty()
  groupId: string;

  @ApiProperty()
  @IsNotEmpty()
  permissionId: string;

}