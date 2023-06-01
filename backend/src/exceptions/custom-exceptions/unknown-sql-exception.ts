import { HttpException, HttpStatus } from '@nestjs/common';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';

export class UnknownSQLException extends HttpException {
  public readonly originalMessage: string;
  public readonly internalCode: ExceptionsInternalCodes;
  constructor(originalMessage: string, operationType?: string) {
    const readableMessage = `${
      operationType ? `${operationType} ` : ''
    }Tt seems like something went wrong while processing your query. Please try again later or contact our support team.`;
    super(readableMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    this.originalMessage = originalMessage;
    this.internalCode = ExceptionsInternalCodes.UNKNOWN_SQL_EXCEPTION;
  }
}
