import { ApiProperty } from '@nestjs/swagger';

export class VerifyAddUserInGroupDs {
  @ApiProperty()
  password: string;
}
