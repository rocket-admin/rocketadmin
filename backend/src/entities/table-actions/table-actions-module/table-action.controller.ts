import {
  Body,
  Controller,
  Inject,
  Injectable,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UseCaseType } from '../../../common/data-injection.tokens.js';
import { MasterPassword, QueryTableName, SlugUuid, UserId } from '../../../decorators/index.js';
import { InTransactionEnum } from '../../../enums/index.js';
import { ConnectionReadGuard } from '../../../guards/index.js';
import { SentryInterceptor } from '../../../interceptors/index.js';
import { ActivateTableActionsDS } from './application/data-sctructures/activate-table-actions.ds.js';
import { ActivatedTableActionsDS } from './application/data-sctructures/activated-table-action.ds.js';
import {
  IActivateTableActions,
} from './use-cases/table-actions-use-cases.interface.js';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

//todo: remove unused code
@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('table actions')
@Injectable()
export class TableActionsController {
  constructor(
    @Inject(UseCaseType.ACTIVATE_TABLE_ACTIONS)
    private readonly activateTableActionsUseCase: IActivateTableActions,
  ) {}

  @ApiOperation({ summary: 'DEPRECATED! Action activation moved into action rules controller!' })
  @ApiResponse({
    status: 201,
    description: 'Activate table actions.',
  })
  @UseGuards(ConnectionReadGuard)
  @Post('/table/actions/activate/:slug')
  async activateActions(
    @SlugUuid() connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @QueryTableName() tableName: string,
    @Query('actionId') actionId: string,
    @Query('confirmed') confirmed: string,
    @Body() body: Array<Record<string, unknown>>,
  ): Promise<ActivatedTableActionsDS> {
    const inputData: ActivateTableActionsDS = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      userId: userId,
      tableName: tableName,
      actionId: actionId,
      confirmed: confirmed && confirmed === 'true' ? true : false,
      request_body: body,
    };

    const activationResult = await this.activateTableActionsUseCase.execute(inputData, InTransactionEnum.OFF);
    if (typeof activationResult === 'object') {
      return activationResult;
    }
    if (activationResult) {
      return { success: activationResult };
    }
    return activationResult;
  }
}
