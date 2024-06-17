import { ApiProperty } from '@nestjs/swagger';

export class CreatedApiKeyDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  hash: string;
}
