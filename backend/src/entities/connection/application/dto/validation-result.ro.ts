import { ApiProperty } from '@nestjs/swagger';

export class ValidationResultRo {
  @ApiProperty()
  isValid: boolean;
}
