import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestWithCognitoInfo } from '../authorization/index.js';
import { Messages } from '../exceptions/text/messages.js';

export const CompanyId = createParamDecorator(async (data: any, ctx: ExecutionContext): Promise<string> => {
  const request: IRequestWithCognitoInfo = ctx.switchToHttp().getRequest();
  const userId = request.decoded?.sub;

  if (!userId) {
    throw new BadRequestException(Messages.USER_ID_MISSING);
  }

  // Company ID should be retrieved from the user entity via a repository lookup
  // This is a simplified version - in practice, you'd inject a UserRepository
  // For now, we'll assume the company ID is added to the request by middleware
  const companyId = (request as any).companyId;

  if (!companyId) {
    throw new BadRequestException('Company ID not found for user');
  }

  return companyId;
});
