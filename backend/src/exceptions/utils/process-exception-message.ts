import { PROCESSING_MESSAGES_FIND } from './processing-messages-find';
import { PROCESSING_MESSAGES_REPLACE } from './processing-messages-replace';

export function processExceptionMessage(message: string): string {
  const msgInLowerCase = message.toLowerCase();
  switch (true) {
    case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.ETIMEDOUT) &&
      msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.AMAZON_HOSTNAME):
      return PROCESSING_MESSAGES_REPLACE.ALLOW_CONNECTIONS;
    case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.ETIMEDOUT):
    case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.getaddrinfo_ENOTFOUND):
    case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.ECONNREFUSED):
    case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.EHOSTUNREACH):
    case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.ECONNRESET):
    case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.SERVER_CLOSED):
      return PROCESSING_MESSAGES_REPLACE.getaddrinfo_ENOTFOUND;
    case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.ORA_02292):
      return PROCESSING_MESSAGES_REPLACE.ORA_02292;
    case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.NO_PGHBA_ENTRY):
      return PROCESSING_MESSAGES_REPLACE.NO_PGHBA_ENTRY;
    case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.UPDATE_COMMAND_DENIED):
      return PROCESSING_MESSAGES_REPLACE.UPDATE_COMMAND_DENIED;
    case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.VIOLATES_FOREIGN_CONSTRAINT_PG):
      return PROCESSING_MESSAGES_REPLACE.VIOLATES_FOREIGN_CONSTRAINT_PG(msgInLowerCase);
    case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.VIOLATES_FOREIGN_CONSTRAINT_MYSQL):
      return PROCESSING_MESSAGES_REPLACE.VIOLATES_FOREIGN_CONSTRAINT_MYSQL(msgInLowerCase);  
    default:
      return message;
  }
}
