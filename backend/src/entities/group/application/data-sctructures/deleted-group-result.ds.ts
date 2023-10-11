import { ApiProperty } from '@nestjs/swagger';

export class DeletedGroupResultDs {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  isMain: boolean;
}
