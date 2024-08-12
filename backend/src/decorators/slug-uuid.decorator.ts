import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/index.js';
import { Messages } from '../exceptions/text/messages.js';
import { ValidationHelper } from '../helpers/validators/validation-helper.js';

export type SlugUuidParameter =
  | 'slug'
  | 'connectionId'
  | 'groupId'
  | 'userId'
  | 'actionId'
  | 'ruleId'
  | 'eventId'
  | 'apiKeyId'
  | 'companyId';
export const SlugUuid = createParamDecorator(
  (parameterName: SlugUuidParameter = 'slug', ctx: ExecutionContext): string => {
    const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
    const availableSlagParameters = [
      'slug',
      'connectionId',
      'groupId',
      'userId',
      'apiKeyId',
      'actionId',
      'ruleId',
      'eventId',
      'companyId',
    ];
    if (!availableSlagParameters.includes(parameterName)) {
      throw new BadRequestException(Messages.UUID_INVALID);
    }
    // eslint-disable-next-line security/detect-object-injection
    const uuId: string = request.params?.[parameterName];

    if (ValidationHelper.isValidUUID(uuId) || ValidationHelper.isValidNanoId(uuId)) {
      return uuId;
    }
    throw new BadRequestException(Messages.UUID_INVALID);
  },
);
