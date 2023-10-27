import { HttpException, HttpStatus } from '@nestjs/common';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';
import { ErrorsMessages } from './messages/custom-errors-messages.js';
import { ValidationError } from 'class-validator';

export class ValidationException extends HttpException {
  public readonly originalMessage: string;
  public readonly internalCode: ExceptionsInternalCodes;

  constructor(originalMessage: string | ValidationError[]) {
    const readableMessage = ErrorsMessages.VALIDATION_FAILED;
    super(readableMessage, HttpStatus.BAD_REQUEST);
    if (Array.isArray(originalMessage)) {
      this.originalMessage = originalMessage
        .map((error) => {
          return `Property "${error.property}" validation failed with following errors: ${Object.values(
            error.constraints,
          ).join(', ')}`;
        })
        .join('.\n');
    } else {
      this.originalMessage = originalMessage;
    }
    this.internalCode = ExceptionsInternalCodes.GET_TABLE_STRUCTURE_EXCEPTION;
  }
}
