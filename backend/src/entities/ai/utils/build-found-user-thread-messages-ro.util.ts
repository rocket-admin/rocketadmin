import { Message } from 'openai/resources/beta/threads/messages.js';
import { FoundUserThreadMessagesRO } from '../application/dto/found-user-thread-messages.ro.js';
import { MessageRolesEnum } from '../application/enums/message-roles.enum.js';

export function buildFoundUserThreadMessagesRO(message: Message): FoundUserThreadMessagesRO {
  return {
    id: message.id,
    createdAt: new Date(message.created_at),
    role: message.role === 'assistant' ? MessageRolesEnum.assistant : MessageRolesEnum.user,
    content: {
      text: message.content[0]['text']['value'],
    },
  };
}
