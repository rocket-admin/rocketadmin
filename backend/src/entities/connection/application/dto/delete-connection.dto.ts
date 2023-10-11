import { ApiProperty } from '@nestjs/swagger';

export class DeleteConnectionDS {
  @ApiProperty()
  reason: string;

  @ApiProperty()
  message: string;
}
