import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/index.js';
import { Messages } from '../exceptions/text/messages.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';

type SlugVerificationType = 'verificationString';
export const VerificationString = createParamDecorator(
  (paramName: SlugVerificationType, ctx: ExecutionContext): string => {
    const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
    // eslint-disable-next-line security/detect-object-injection
    const verificationString: string = request.params?.[paramName] || request.params?.slug;
    const isValidString = ValidationHelper.isValidVerificationString(verificationString);
    if (isValidString) {
      return verificationString;
    }
    throw new BadRequestException(Messages.VERIFICATION_STRING_INCORRECT);
  },
);
