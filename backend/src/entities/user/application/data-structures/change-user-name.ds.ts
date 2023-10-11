import { ApiProperty } from '@nestjs/swagger';

export class ChangeUserNameDS {
  id: string;

  @ApiProperty()
  name: string;
}
