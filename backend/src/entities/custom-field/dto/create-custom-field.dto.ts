import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomFieldDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  text: string;

  @ApiProperty()
  template_string: string;
}

export class UpdateCustomFieldDTO extends CreateCustomFieldDto {
  @ApiProperty()
  id: string;
}
