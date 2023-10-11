import { ApiProperty } from '@nestjs/swagger';

export class CreateDeleteGroupInConnectionResponseDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  isMain: boolean;

  @ApiProperty({ required: false, isArray: true })
  permissions?: Array<any>;

  @ApiProperty({ required: false, isArray: true })
  users?: Array<any>;
}
