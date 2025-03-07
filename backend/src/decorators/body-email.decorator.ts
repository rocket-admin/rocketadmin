import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/index.js';
import { Messages } from '../exceptions/text/messages.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';
import { isObjectPropertyExists } from '../helpers/validators/is-object-property-exists-validator.js';

export const BodyEmail = createParamDecorator((data: any, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const body = request.body;
  if (isObjectPropertyExists(body, 'email')) {
    const email = body['email'];
    if (ValidationHelper.isValidEmail(email)) {
      return email;
    }
    throw new BadRequestException(Messages.EMAIL_SYNTAX_INVALID);
  }
  throw new BadRequestException(Messages.USER_EMAIL_MISSING);
});
