import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePermissionDto {
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

}
