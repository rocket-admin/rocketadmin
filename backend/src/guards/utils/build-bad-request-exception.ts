import { HttpException, HttpStatus } from '@nestjs/common';

export const buildBadRequestException = (message: string): HttpException => {
  return new HttpException(
    {
      message: message,
    },
    HttpStatus.BAD_REQUEST,
  );
};
