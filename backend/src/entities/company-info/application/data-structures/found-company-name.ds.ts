import { ApiProperty } from '@nestjs/swagger';

export class FoundCompanyNameDs {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}
