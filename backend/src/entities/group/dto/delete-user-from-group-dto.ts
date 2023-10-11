import { ApiProperty } from '@nestjs/swagger';

export class DeleteUserFromGroupDTO {
  @ApiProperty()
  email: string;

  @ApiProperty()
  groupId: string;
}
