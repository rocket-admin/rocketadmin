import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/index.js';
import { Messages } from '../exceptions/text/messages.js';
import { buildBadRequestException } from '../guards/utils/index.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';

export const SlugUuid = createParamDecorator((data: any, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const uuId: string = request.params?.slug;
  const validationResult = ValidationHelper.isValidUUID(uuId);
  if (validationResult) {
    return uuId;
  }
  throw buildBadRequestException(Messages.UUID_INVALID);
});
