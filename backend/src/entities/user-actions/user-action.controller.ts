import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Body, Controller, HttpException, HttpStatus, Inject, Post, Req, UseInterceptors } from '@nestjs/common';
import { SentryInterceptor } from '../../interceptors';
import { IRequestWithCognitoInfo } from '../../authorization';
import { UserActionEntity } from './user-action.entity';
import { getCognitoUserName } from '../../helpers';
import { CreateUserActionDto } from './dto/create-user-action.dto';
import { UserActionEnum } from '../../enums';
import { Messages } from '../../exceptions/text/messages';
import { validateStringWithEnum } from '../../helpers/validators/validate-string-with-enum';
import { UseCaseType } from '../../common/data-injection.tokens';
import { ICreateUserAction } from './use-cases/use-cases-interfaces';
import { CreateUserActionDs } from './application/data-sctructures/create-user-action.ds';

@ApiBearerAuth()
@ApiTags('user_action')
@UseInterceptors(SentryInterceptor)
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
    @Req() request: IRequestWithCognitoInfo,
    @Body('message') message: UserActionEnum,
  ): Promise<Omit<UserActionEntity, 'user'>> {
    const userId = getCognitoUserName(request);
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
