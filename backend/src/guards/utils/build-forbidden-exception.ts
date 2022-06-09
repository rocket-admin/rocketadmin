import { HttpException, HttpStatus } from '@nestjs/common';

export const buildForbiddenException = (message: string): HttpException => {
  return new HttpException(
    {
      message: message,
    },
    HttpStatus.FORBIDDEN,
  );
};
