import { ApiProperty } from '@nestjs/swagger';

export class ActivateTableActionRO {
  @ApiProperty({ required: false })
  location?: string;
}
