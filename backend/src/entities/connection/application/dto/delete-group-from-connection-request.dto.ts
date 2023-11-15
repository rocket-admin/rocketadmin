import { ApiProperty } from '@nestjs/swagger';

export class DeleteGroupFromConnectionDTO {
  @ApiProperty()
  groupId: string;
}
