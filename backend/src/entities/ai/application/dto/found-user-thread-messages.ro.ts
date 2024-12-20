import { ApiProperty } from '@nestjs/swagger';
import { MessageRolesEnum } from '../enums/message-roles.enum.js';

export class FoundMessageContentRO {
  @ApiProperty()
  text: string;
}

export class FoundUserThreadMessagesRO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  role: MessageRolesEnum;

  @ApiProperty({ type: FoundMessageContentRO })
  content: FoundMessageContentRO;
}
