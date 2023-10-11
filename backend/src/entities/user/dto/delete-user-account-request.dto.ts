import { ApiProperty } from '@nestjs/swagger';

export class DeleteUserAccountDTO {
  @ApiProperty()
  reason: string;

  @ApiProperty()
  password: string;
}
