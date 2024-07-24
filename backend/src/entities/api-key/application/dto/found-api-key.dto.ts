import { ApiProperty } from '@nestjs/swagger';

export class FoundApiKeyDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;
}
