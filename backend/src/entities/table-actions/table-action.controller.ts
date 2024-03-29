import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import validator from 'validator';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword, QueryTableName, SlugUuid, UserId } from '../../decorators/index.js';
import { InTransactionEnum, TableActionTypeEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { ConnectionEditGuard, ConnectionReadGuard } from '../../guards/index.js';
import { validateStringWithEnum } from '../../helpers/validators/validate-string-with-enum.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { ActivateTableActionDS } from './application/data-sctructures/activate-table-action.ds.js';
import { ActivateTableActionsDS } from './application/data-sctructures/activate-table-actions.ds.js';
import { ActivatedTableActionsDS } from './application/data-sctructures/activated-table-action.ds.js';
import { CreateTableActionDS } from './application/data-sctructures/create-table-action.ds.js';
import { CreatedTableActionDS } from './application/data-sctructures/created-table-action.ds.js';
import { FindTableActionsDS } from './application/data-sctructures/find-table-actions.ds.js';
import { UpdateTableActionDS } from './application/data-sctructures/update-table-action.ds.js';
import {
  IActivateTableAction,
  IActivateTableActions,
  ICreateTableAction,
  IDeleteTableAction,
  IFindAllTableActions,
  IFindTableAction,
  IUpdateTableAction,
} from './use-cases/table-actions-use-cases.interface.js';
import { FoundTableActionsDS } from './application/data-sctructures/found-table-actions.ds.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ActivateTableActionRO } from './dto/activate-table-action.ro.js';
import { CreateTableActionDTO } from './dto/create-table-action.dto.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('table actions')
@Injectable()
export class TableActionsController {
  constructor(
    @Inject(UseCaseType.CREATE_TABLE_ACTION)
    private readonly createTableActionUseCase: ICreateTableAction,
    @Inject(UseCaseType.FIND_TABLE_ACTIONS)
    private readonly findTableActionsUseCase: IFindAllTableActions,
    @Inject(UseCaseType.ACTIVATE_TABLE_ACTION)
    private readonly activateTableActionUseCase: IActivateTableAction,
    @Inject(UseCaseType.ACTIVATE_TABLE_ACTIONS)
    private readonly activateTableActionsUseCase: IActivateTableActions,
    @Inject(UseCaseType.UPDATE_TABLE_ACTION)
    private readonly updateTableActionUseCase: IUpdateTableAction,
    @Inject(UseCaseType.DELETE_TABLE_ACTION)
    private readonly deleteTableActionUseCase: IDeleteTableAction,
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
    type: CreatedTableActionDS,
  })
  @UseGuards(ConnectionReadGuard)
  @Get('/table/action/:slug')
  async findTableAction(@Query('actionId') actionId: string): Promise<CreatedTableActionDS> {
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

  @ApiOperation({ summary: 'Create table action' })
  @ApiBody({ type: CreateTableActionDTO })
  @ApiResponse({
    status: 201,
    description: 'Create table action.',
    type: CreatedTableActionDS,
  })
  @UseGuards(ConnectionEditGuard)
  @Post('/table/action/:slug')
  async createAction(
    @SlugUuid() connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @QueryTableName() tableName: string,
    @Body() tableActionData: CreateTableActionDTO,
  ): Promise<CreatedTableActionDS> {
    const { title, url, icon, type, requireConfirmation } = tableActionData;
    const inputData: CreateTableActionDS = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      userId: userId,
      tableName: tableName,
      title: title,
      url: url,
      type: type,
      icon: icon,
      requireConfirmation: requireConfirmation,
    };
    this.validateTableAction(inputData);
    return await this.createTableActionUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Update table action' })
  @ApiBody({ type: CreateTableActionDTO })
  @ApiResponse({
    status: 200,
    description: 'Update table action.',
    type: CreatedTableActionDS,
  })
  @UseGuards(ConnectionEditGuard)
  @Put('/table/action/:slug')
  async updateAction(
    @Query('actionId') actionId: string,
    @Body() tableActionData: CreateTableActionDTO,
  ): Promise<CreatedTableActionDS> {
    const { title, url, icon, type, requireConfirmation } = tableActionData;
    const inputData: UpdateTableActionDS = {
      actionId: actionId,
      title: title,
      url: url,
      type: type,
      icon: icon,
      requireConfirmation: requireConfirmation,
    };
    this.validateTableAction(inputData);
    return await this.updateTableActionUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Delete table action' })
  @ApiResponse({
    status: 200,
    description: 'Delete table action.',
    type: CreatedTableActionDS,
  })
  @UseGuards(ConnectionEditGuard)
  @Delete('/table/action/:slug')
  async deleteAction(@Query('actionId') actionId: string): Promise<CreatedTableActionDS> {
    return await this.deleteTableActionUseCase.execute(actionId, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Activate table action' })
  @ApiResponse({
    status: 201,
    description: 'Activate table action.',
    type: ActivateTableActionRO,
  })
  @UseGuards(ConnectionReadGuard)
  @Post('/table/action/activate/:slug')
  async activateAction(
    @SlugUuid() connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @QueryTableName() tableName: string,
    @Query('actionId') actionId: string,
    @Query('confirmed') confirmed: string,
    @Body() body: Record<string, unknown>,
  ): Promise<void | { location: string }> {
    const inputData: ActivateTableActionDS = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      userId: userId,
      tableName: tableName,
      actionId: actionId,
      confirmed: confirmed && confirmed === 'true' ? true : false,
      request_body: body,
    };

    return await this.activateTableActionUseCase.execute(inputData, InTransactionEnum.OFF);
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

    return await this.activateTableActionsUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  private validateTableAction(tableAction: CreateTableActionDS | UpdateTableActionDS): void {
    const result = validateStringWithEnum(tableAction.type, TableActionTypeEnum);
    if (!result) {
      throw new HttpException(
        {
          message: Messages.TABLE_ACTION_TYPE_INCORRECT,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!validator.isURL(tableAction.url)) {
      throw new HttpException({ message: Messages.URL_INVALID }, HttpStatus.BAD_REQUEST);
    }
  }
}
