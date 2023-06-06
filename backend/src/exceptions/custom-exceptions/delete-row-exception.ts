import { HttpException, HttpStatus } from '@nestjs/common';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';
import { ErrorsMessages } from './messages/custom-errors-messages.js';

export class DeleteRowException extends HttpException {
  public readonly originalMessage: string;
  public readonly internalCode: ExceptionsInternalCodes;
  constructor(originalMessage: string) {
    const readableMessage = ErrorsMessages.FAILED_TO_DELETE_ROW;
    super(readableMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    this.originalMessage = originalMessage;
    this.internalCode = ExceptionsInternalCodes.UNKNOWN_SQL_EXCEPTION;
  }
}
