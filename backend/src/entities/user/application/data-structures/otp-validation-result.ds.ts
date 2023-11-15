import { ApiProperty } from '@nestjs/swagger';

export class OtpValidationResultDS {
  @ApiProperty()
  validated: boolean;
}

export class OtpDisablingResultDS {
  @ApiProperty()
  disabled: boolean;
}
