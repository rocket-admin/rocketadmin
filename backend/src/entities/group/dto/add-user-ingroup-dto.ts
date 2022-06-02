import { ApiProperty } from '@nestjs/swagger';

export class AddUserIngroupDto {
  @ApiProperty()
  email: string

  @ApiProperty()
  groupId: string

}
