import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization';
import { ValidationHelper } from '../helpers/validators/ValidationHelper';
import { Messages } from '../exceptions/text/messages';
import { buildBadRequestException } from '../guards/utils';

export const BodyEmail = createParamDecorator((data: any, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const body = request.body;
  if (body.hasOwnProperty('email')) {
    // eslint-disable-next-line security/detect-object-injection
    const email = body['email'];
    if (ValidationHelper.isValidEmail(email)) {
      return email;
    }
    throw buildBadRequestException(Messages.EMAIL_SYNTAX_INVALID);
  }
  throw buildBadRequestException(Messages.USER_EMAIL_MISSING);
});
