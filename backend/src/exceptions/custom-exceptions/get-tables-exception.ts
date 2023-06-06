import { HttpException, HttpStatus } from '@nestjs/common';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';
import { ErrorsMessages } from './messages/custom-errors-messages.js';

export class GetTablesException extends HttpException {
  public readonly originalMessage: string;
  public readonly internalCode: ExceptionsInternalCodes;
  constructor(originalMessage: string) {
    const readableMessage = ErrorsMessages.FAILED_TO_GET_TABLES;
    super(readableMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    this.originalMessage = originalMessage;
    this.internalCode = ExceptionsInternalCodes.GET_TABLES_EXCEPTION;
  }
}
