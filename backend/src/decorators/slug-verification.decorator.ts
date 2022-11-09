import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization';
import { Messages } from '../exceptions/text/messages';
import { buildBadRequestException } from '../guards/utils';
import { ValidationHelper } from '../helpers/validators/validation-helper';

export const VerificationString = createParamDecorator((data: any, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const verificationString: string = request.params?.slug;
  const isValidString = ValidationHelper.isValidVerificationString(verificationString);
  if (isValidString) {
    return verificationString;
  }
  throw buildBadRequestException(Messages.VERIFICATION_STRING_INCORRECT);
});
