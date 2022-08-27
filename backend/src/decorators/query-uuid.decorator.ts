import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization';
import { ValidationHelper } from '../helpers/validators/ValidationHelper';
import { buildBadRequestException } from '../guards/utils';
import { Messages } from '../exceptions/text/messages';

export const QueryUuid = createParamDecorator((paramName: string, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const query = request.query;
  if (query.hasOwnProperty(paramName)) {
    // eslint-disable-next-line security/detect-object-injection
    const uuId = query[paramName];
    if (ValidationHelper.isValidUUID(uuId)) {
      return uuId;
    }
    throw buildBadRequestException(Messages.UUID_INVALID);
  }
  throw buildBadRequestException(Messages.PARAMETER_NAME_MISSING(paramName));
});
