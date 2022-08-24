import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization';
import { buildBadRequestException } from '../guards/utils';
import { Messages } from '../exceptions/text/messages';
import { ValidationHelper } from '../helpers/validators/ValidationHelper';

export const SlugUuid = createParamDecorator((data: any, ctx: ExecutionContext): string => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const uuId: string = request.params?.slug;
  const validationResult = ValidationHelper.isValidUUID(uuId);
  if (validationResult) {
    return uuId;
  }
  throw buildBadRequestException(Messages.UUID_INVALID);
});
