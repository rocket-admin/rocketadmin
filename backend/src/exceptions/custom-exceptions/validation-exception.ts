import { HttpException, HttpStatus } from '@nestjs/common';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';
import { ValidationError } from 'class-validator';

export class ValidationException extends HttpException {
  public readonly originalMessage: string;
  public readonly internalCode: ExceptionsInternalCodes;

  constructor(originalMessage: string | ValidationError[]) {
    if (Array.isArray(originalMessage)) {
      originalMessage = originalMessage
        .map((error) => {
          return `Property "${error.property}" validation failed with following errors: ${Object.values(
            error.constraints,
          ).join(', ')}`;
        })
        .join('.\n');
    } else {
      originalMessage = originalMessage;
    }
    super(originalMessage, HttpStatus.BAD_REQUEST);
    this.internalCode = ExceptionsInternalCodes.VALIDATOR_EXCEPTION;
  }
}
