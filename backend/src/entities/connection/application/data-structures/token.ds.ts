import { ApiProperty } from '@nestjs/swagger';

export class TokenDs {
  @ApiProperty()
  token: string;
}
