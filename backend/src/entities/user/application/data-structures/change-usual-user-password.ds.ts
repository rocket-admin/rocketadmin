import { ApiProperty } from '@nestjs/swagger';

export class ChangeUsualUserPasswordDs {
  @ApiProperty()
  email: string;

  @ApiProperty()
  newPassword: string;

  @ApiProperty()
  oldPassword: string;
}
