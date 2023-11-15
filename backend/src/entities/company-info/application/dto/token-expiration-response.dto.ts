import { ApiProperty } from '@nestjs/swagger';

export class TokenExpirationResponseDto {
  @ApiProperty()
  expires: Date;

  @ApiProperty()
  isTemporary: boolean;
}
