import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import validator from 'validator';
import { UseCaseType } from '../../../common/data-injection.tokens.js';
import { MasterPassword, QueryTableName, SlugUuid, UserId } from '../../../decorators/index.js';
import { InTransactionEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { ConnectionReadGuard } from '../../../guards/index.js';
import { SentryInterceptor } from '../../../interceptors/index.js';
import { ActivateTableActionsDS } from './application/data-sctructures/activate-table-actions.ds.js';
import { ActivatedTableActionsDS } from './application/data-sctructures/activated-table-action.ds.js';
import { FindTableActionsDS } from './application/data-sctructures/find-table-actions.ds.js';
import {
  IActivateTableActions,
  IFindAllTableActions,
  IFindTableAction,
} from './use-cases/table-actions-use-cases.interface.js';
import { FoundTableActionsDS } from './application/data-sctructures/found-table-actions.ds.js';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FoundTableActionDTO } from '../table-action-rules-module/application/dto/found-action-rules-with-actions-and-events.dto.js';

//todo: remove unused code
@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('table actions')
@Injectable()
export class TableActionsController {
  constructor(
    @Inject(UseCaseType.FIND_TABLE_ACTIONS)
    private readonly findTableActionsUseCase: IFindAllTableActions,
    @Inject(UseCaseType.ACTIVATE_TABLE_ACTIONS)
    private readonly activateTableActionsUseCase: IActivateTableActions,
    @Inject(UseCaseType.FIND_TABLE_ACTION)
    private readonly findTableActionUseCase: IFindTableAction,
  ) {}

  @ApiOperation({ summary: 'Get table actions' })
  @ApiResponse({
    status: 200,
    description: 'Returns table actions.',
    type: FoundTableActionsDS,
  })
  @UseGuards(ConnectionReadGuard)
  @Get('/table/actions/:slug')
  async findTableActions(
    @SlugUuid() connectionId: string,
    @QueryTableName() tableName: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<FoundTableActionsDS> {
    const inputData: FindTableActionsDS = {
      connectionId: connectionId,
      tableName: tableName,
      userId: userId,
      masterPwd: masterPwd,
    };
    return await this.findTableActionsUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Get table action by id' })
  @ApiResponse({
    status: 200,
    description: 'Returns table action with specified id.',
    type: FoundTableActionDTO,
  })
  @UseGuards(ConnectionReadGuard)
  @Get('/table/action/:slug')
  async findTableAction(@Query('actionId') actionId: string): Promise<FoundTableActionDTO> {
    if (!validator.isUUID) {
      throw new HttpException(
        {
          message: Messages.UUID_INVALID,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.findTableActionUseCase.execute(actionId, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Activate multiple table actions' })
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
