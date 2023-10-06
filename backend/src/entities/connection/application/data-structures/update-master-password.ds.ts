import { ApiProperty } from '@nestjs/swagger';

export class UpdateMasterPasswordDs {
  connectionId: string;

  @ApiProperty()
  newMasterPwd: string;

  @ApiProperty()
  oldMasterPwd: string;
}
