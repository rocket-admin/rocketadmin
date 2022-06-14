import { ApiProperty } from '@nestjs/swagger';

export class UpdateCustomFieldDto {

  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  text: string;

  @ApiProperty()
  template_string: string;

}
