import { HttpException, HttpStatus } from '@nestjs/common';

export class NonAvailableInFreePlanException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.PAYMENT_REQUIRED);
  }
}
