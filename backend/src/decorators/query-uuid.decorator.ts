import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/index.js';
import { Messages } from '../exceptions/text/messages.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';
import { isObjectPropertyExists } from '../helpers/validators/is-object-property-exists-validator.js';

export const QueryUuid = createParamDecorator((paramName: string, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const query = request.query;
  if (isObjectPropertyExists(query, paramName)) {
    // eslint-disable-next-line security/detect-object-injection
    const uuId = query[paramName];
    if (ValidationHelper.isValidUUID(uuId) || ValidationHelper.isValidNanoId(uuId)) {
      return uuId;
    }
    throw new BadRequestException(Messages.UUID_INVALID);
  }
  throw new BadRequestException(Messages.PARAMETER_NAME_MISSING(paramName));
});
