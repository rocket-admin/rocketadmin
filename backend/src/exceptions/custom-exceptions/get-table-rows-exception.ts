import { HttpException, HttpStatus } from '@nestjs/common';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';
import { ErrorsMessages } from './messages/custom-errors-messages.js';

export class GetRowsException extends HttpException {
  public readonly originalMessage: string;
  public readonly internalCode: ExceptionsInternalCodes;
  constructor(originalMessage: string) {
    const readableMessage = ErrorsMessages.FAILED_TO_GET_TABLE_ROWS;
    super(readableMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    this.originalMessage = originalMessage;
    this.internalCode = ExceptionsInternalCodes.GET_TABLE_ROWS_EXCEPTION;
  }
}
