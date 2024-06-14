import { ApiProperty } from '@nestjs/swagger';

export class FoundApiKeyDto {
  @ApiProperty()
  title: string;
}
