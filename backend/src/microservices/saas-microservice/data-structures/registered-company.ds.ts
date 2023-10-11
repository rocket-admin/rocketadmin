import { ApiProperty } from '@nestjs/swagger';

export class RegisteredCompanyDS {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  companyId: string;
}
