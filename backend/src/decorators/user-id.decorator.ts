import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/index.js';
import { Messages } from '../exceptions/text/messages.js';
import { buildBadRequestException } from '../guards/utils/index.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';

export const UserId = createParamDecorator((data: any, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const userId = request.decoded?.sub;
  if (!userId) {
    throw buildBadRequestException(Messages.USER_ID_MISSING);
  }
  if (ValidationHelper.isValidUUID(userId)) {
    return userId;
  }
  throw buildBadRequestException(Messages.UUID_INVALID);
});
