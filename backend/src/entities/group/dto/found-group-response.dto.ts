import { ApiProperty } from '@nestjs/swagger';

export class FoundGroupResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  isMain: boolean;
}
