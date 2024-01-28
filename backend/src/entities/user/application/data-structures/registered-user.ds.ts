import { ApiProperty } from '@nestjs/swagger';
import { IToken } from '../../utils/generate-gwt-token.js';

export class RegisteredUserDs {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  token: IToken;

  @ApiProperty()
  name: string;
}
