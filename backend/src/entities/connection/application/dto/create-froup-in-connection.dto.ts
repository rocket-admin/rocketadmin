import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupInConnectionDTO {
  @ApiProperty()
  title: string;
}
