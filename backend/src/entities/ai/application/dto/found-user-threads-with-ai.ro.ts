import { ApiProperty } from '@nestjs/swagger';

export class FoundUserThreadsWithAiRO {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false })
  title: string | null;

  @ApiProperty()
  createdAt: Date;
}
