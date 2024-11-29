import { ApiProperty } from '@nestjs/swagger';

export class ResponseInfoDS {
  @ApiProperty()
  response_message: string;
}
