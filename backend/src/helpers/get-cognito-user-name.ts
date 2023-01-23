import { IRequestWithCognitoInfo } from '../authorization/index.js';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import { Messages } from '../exceptions/text/messages.js';
import { HttpStatus } from '@nestjs/common';

export function getCognitoUserName(request: IRequestWithCognitoInfo): string {
  const cognitoUserName = request.decoded.sub;
  if (cognitoUserName) {
    return cognitoUserName;
  } else {
    throw new HttpException(
      {
        message: Messages.COGNITO_USERNAME_MISSING,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
