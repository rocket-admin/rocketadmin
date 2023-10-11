import { ApiProperty } from '@nestjs/swagger';

export class FoundCustomFieldsDs {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  template_string: string;

  @ApiProperty()
  text: string;
}
