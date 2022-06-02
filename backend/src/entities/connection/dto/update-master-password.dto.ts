import { ApiProperty } from '@nestjs/swagger';

export class UpdateMasterPasswordDto {

  @ApiProperty()
  oldMasterPwd: string;

  @ApiProperty()
  newMasterPwd: string;

}
