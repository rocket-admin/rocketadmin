import { ApiProperty } from '@nestjs/swagger';

export class TestConnectionResponseDTO {
  @ApiProperty()
  result: boolean;

  @ApiProperty()
  message: string;
}
