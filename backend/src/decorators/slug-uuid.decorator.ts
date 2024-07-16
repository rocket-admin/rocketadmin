import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/index.js';
import { Messages } from '../exceptions/text/messages.js';
import { buildBadRequestException } from '../guards/utils/index.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';

export type SlugUuidParameter = 'slug' | 'connectionId' | 'groupId' | 'userId' | 'actionId' | 'ruleId' | 'eventId' | 'apiKeyId';
export const SlugUuid = createParamDecorator(
  (parameterName: SlugUuidParameter = 'slug', ctx: ExecutionContext): string => {
    const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
    const availableSlagParameters = ['slug', 'connectionId', 'groupId', 'userId', 'apiKeyId', 'actionId', 'ruleId', 'eventId'];
    if (!availableSlagParameters.includes(parameterName)) {
      throw buildBadRequestException(Messages.UUID_INVALID);
    }
    // eslint-disable-next-line security/detect-object-injection
    const uuId: string = request.params?.[parameterName];
    const validationResult = ValidationHelper.isValidUUID(uuId);
    if (validationResult) {
      return uuId;
    }
    throw buildBadRequestException(Messages.UUID_INVALID);
  },
);
