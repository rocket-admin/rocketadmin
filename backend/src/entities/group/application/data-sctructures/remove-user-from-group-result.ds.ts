import { ApiProperty } from '@nestjs/swagger';

export class UsersInGroupInfoDS {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  isActive: boolean;
}

export class RemoveUserFromGroupResultDs {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  isMain: boolean;

  @ApiProperty({ isArray: true, type: UsersInGroupInfoDS })
  users: Array<UsersInGroupInfoDS>;
}
