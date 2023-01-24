import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/index.js';
import { Messages } from '../exceptions/text/messages.js';
import { buildBadRequestException } from '../guards/utils/index.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';

export const VerificationString = createParamDecorator((data: any, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const verificationString: string = request.params?.slug;
  const isValidString = ValidationHelper.isValidVerificationString(verificationString);
  if (isValidString) {
    return verificationString;
  }
  throw buildBadRequestException(Messages.VERIFICATION_STRING_INCORRECT);
});
