import { Body, Controller, Inject, Injectable, Post, UseInterceptors } from '@nestjs/common';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { UserId } from '../../decorators/index.js';
import { InTransactionEnum } from '../../enums/index.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { CreateUserActionDs } from './application/data-sctructures/create-user-action.ds.js';
import { ICreateUserAction } from './use-cases/use-cases-interfaces.js';
import { UserActionEntity } from './user-action.entity.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserActionDto } from './dto/create-user-action.dto.js';

@UseInterceptors(SentryInterceptor)
@Injectable()
@Controller()
@ApiBearerAuth()
@ApiTags('User actions')
export class UserActionController {
  constructor(
    @Inject(UseCaseType.CREATE_USER_ACTION)
    private readonly createUserActionUseCase: ICreateUserAction,
  ) {}

  @ApiOperation({ summary: 'Create new user action' })
  @ApiResponse({ status: 201, description: 'User action created.' })
  @ApiBody({ type: CreateUserActionDto })
  @Post('action')
  async createUserAction(
    @Body() userActionData: CreateUserActionDto,
    @UserId() userId: string,
  ): Promise<Omit<UserActionEntity, 'user'>> {
    const actionData: CreateUserActionDs = {
      message: userActionData.message,
      userId: userId,
    };
    return await this.createUserActionUseCase.execute(actionData, InTransactionEnum.ON);
  }
}
