import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePermissionsDto {
  @ApiProperty()
  @IsNotEmpty()
  connection: {};

  @ApiProperty()
  @IsNotEmpty()
  group: {};

  @ApiProperty()
  tables: {};

}
