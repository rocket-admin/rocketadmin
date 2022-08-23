import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization';
import validator from 'validator';
import { Constants } from '../helpers/constants/constants';
import { buildBadRequestException } from '../guards/utils';
import { Messages } from '../exceptions/text/messages';

export const VerificationString = createParamDecorator((data: any, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const verificationString: string = request.params?.slug;
  const isValidString = validator.isWhitelisted(verificationString, Constants.VERIFICATION_STRING_WHITELIST());
  if (isValidString) {
    return verificationString;
  }
  throw buildBadRequestException(Messages.VERIFICATION_STRING_INCORRECT);
});
