import { ApiProperty } from "@nestjs/swagger";

export class FindUserDs {
  id: string;
  gclidValue?: string;
}

export class SimpleUserInfoDs {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  role: string;
}
