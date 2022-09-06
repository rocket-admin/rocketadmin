import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Post,
  Scope,
  UseInterceptors,
} from '@nestjs/common';
import { SentryInterceptor } from '../../interceptors';
import { UserActionEntity } from './user-action.entity';
import { CreateUserActionDto } from './dto/create-user-action.dto';
import { UserActionEnum } from '../../enums';
import { Messages } from '../../exceptions/text/messages';
import { validateStringWithEnum } from '../../helpers/validators/validate-string-with-enum';
import { UseCaseType } from '../../common/data-injection.tokens';
import { ICreateUserAction } from './use-cases/use-cases-interfaces';
import { CreateUserActionDs } from './application/data-sctructures/create-user-action.ds';
import { UserId } from '../../decorators';

@ApiBearerAuth()
@ApiTags('user_action')
@UseInterceptors(SentryInterceptor)
@Injectable({ scope: Scope.REQUEST })
@Controller()
export class UserActionController {
  constructor(
    @Inject(UseCaseType.CREATE_USER_ACTION)
    private readonly createUserActionUseCase: ICreateUserAction,
  ) {}

  @ApiOperation({ summary: 'Create user action message' })
  @ApiResponse({ status: 201, description: 'Created user action message' })
  @ApiBody({ type: CreateUserActionDto })
  @Post('action')
  async createUserAction(
    @Body('message') message: UserActionEnum,
    @UserId() userId: string,
  ): Promise<Omit<UserActionEntity, 'user'>> {
    if (!userId || !message) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!validateStringWithEnum(message, UserActionEnum)) {
      throw new HttpException(
        {
          message: Messages.USER_ACTION_INCORRECT,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const actionData: CreateUserActionDs = {
      message: message,
      userId: userId,
    };
    return await this.createUserActionUseCase.execute(actionData);
  }
}
