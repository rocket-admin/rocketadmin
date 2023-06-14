import { HttpException, HttpStatus } from '@nestjs/common';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';

export class UnknownSQLException extends HttpException {
  public readonly originalMessage: string;
  public readonly internalCode: ExceptionsInternalCodes;
  constructor(originalMessage: string, operationType?: string) {
    const additionalMessage = isAgentNoDataError(originalMessage) ? 'No data returned from agent': `It seems like something went wrong while processing your query. Please try again later or contact our support team.`;
    const readableMessage = `${
      operationType ? `${operationType} ` : ''
    }${additionalMessage}`;
    super(readableMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    this.originalMessage = originalMessage;
    this.internalCode = ExceptionsInternalCodes.UNKNOWN_SQL_EXCEPTION;
  }
}

function isAgentNoDataError(originalMessage: string): boolean {
  return originalMessage === 'No data returned from agent';
}