import { ApiProperty } from '@nestjs/swagger';

export class ConnectionTokenResponseDTO {
  @ApiProperty()
  token: string;
}
