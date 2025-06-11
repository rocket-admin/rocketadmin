import { HttpException, HttpStatus } from '@nestjs/common';
import { Messages } from '../text/messages.js';

export class NonAvailableInFreePlanException extends HttpException {
  constructor(message: string = Messages.FEATURE_NON_AVAILABLE_IN_FREE_PLAN) {
    super(message, HttpStatus.PAYMENT_REQUIRED);
  }
}
