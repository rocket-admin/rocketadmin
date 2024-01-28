import { ApiProperty } from '@nestjs/swagger';

export class FoundUserInGroupDs {
  @ApiProperty()
  id: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  email: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  name: string;
}
