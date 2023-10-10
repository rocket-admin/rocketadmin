import { ApiProperty } from '@nestjs/swagger';

export class UsualLoginDs {
  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;

  gclidValue: string;
}
