import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization';
import { Messages } from '../exceptions/text/messages';
import { buildBadRequestException } from '../guards/utils';
import { ValidationHelper } from '../helpers/validators/validation-helper';

export const BodyUuid = createParamDecorator((paramName: string, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const body = request.body;
  if (body.hasOwnProperty(paramName)) {
    // eslint-disable-next-line security/detect-object-injection
    const uuId = body[paramName];
    if (ValidationHelper.isValidUUID(uuId)) {
      return uuId;
    }
    throw buildBadRequestException(Messages.UUID_INVALID);
  }
  throw buildBadRequestException(Messages.PARAMETER_NAME_MISSING(paramName));
});
