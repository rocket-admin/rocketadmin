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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import validator from 'validator';
import { UseCaseType } from '../../common/data-injection.tokens';
import { MasterPassword, QueryTableName, SlugUuid, UserId } from '../../decorators';
import { InTransactionEnum, TableActionTypeEnum } from '../../enums';
import { Messages } from '../../exceptions/text/messages';
import { ConnectionEditGuard, ConnectionReadGuard } from '../../guards';
import { validateStringWithEnum } from '../../helpers/validators/validate-string-with-enum';
import { SentryInterceptor } from '../../interceptors';
import { ActivateTableActionDS } from './application/data-sctructures/activate-table-action.ds';
import { CreateTableActionDS } from './application/data-sctructures/create-table-action.ds';
import { CreatedTableActionDS } from './application/data-sctructures/created-table-action.ds';
import { FindTableActionsDS } from './application/data-sctructures/find-table-actions.ds';
import { UpdateTableActionDS } from './application/data-sctructures/update-table-action.ds';
import { CreateTableActionDTO } from './dto/create-table-action.dto';
import { UpdateTableActionDTO } from './dto/update-table-action.dto';
import {
  IActivateTableAction,
  ICreateTableAction,
  IDeleteTableAction,
  IFindAllTableActions,
  IFindTableAction,
  IUpdateTableAction,
} from './use-cases/table-actions-use-cases.interface';

@ApiBearerAuth()
@ApiTags('table_actions')
@UseInterceptors(SentryInterceptor)
@Controller()
@Injectable()
export class TableActionsController {
  constructor(
    @Inject(UseCaseType.CREATE_TABLE_ACTION)
    private readonly createTableActionUseCase: ICreateTableAction,
    @Inject(UseCaseType.FIND_TABLE_ACTIONS)
    private readonly findTableActionsUseCase: IFindAllTableActions,
    @Inject(UseCaseType.ACTIVATE_TABLE_ACTION)
    private readonly activateTableActionUseCase: IActivateTableAction,
    @Inject(UseCaseType.UPDATE_TABLE_ACTION)
    private readonly updateTableActionUseCase: IUpdateTableAction,
    @Inject(UseCaseType.DELETE_TABLE_ACTION)
    private readonly deleteTableActionUseCase: IDeleteTableAction,
    @Inject(UseCaseType.FIND_TABLE_ACTION)
    private readonly findTableActionUseCase: IFindTableAction,
  ) {}

  @ApiOperation({ summary: 'Receive table actions' })
  @ApiResponse({ status: 200, description: 'Table actions received' })
  @ApiBody({ type: CreateTableActionDTO })
  @UseGuards(ConnectionReadGuard)
  @Get('/table/actions/:slug')
  async findTableActions(
    @SlugUuid() connectionId: string,
    @QueryTableName() tableName: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<Array<CreatedTableActionDS>> {
    const inputData: FindTableActionsDS = {
      connectionId: connectionId,
      tableName: tableName,
      userId: userId,
      masterPwd: masterPwd,
    };
    return await this.findTableActionsUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Receive table action' })
  @ApiResponse({ status: 200, description: 'Table action received' })
  @ApiBody({ type: CreateTableActionDTO })
  @UseGuards(ConnectionReadGuard)
  @Get('/table/action/:slug')
  async findTableAction(
    @Query('actionId') actionId: string,
  ): Promise<CreatedTableActionDS> {
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
  @ApiResponse({ status: 201, description: 'Table action successfully created' })
  @ApiBody({ type: CreateTableActionDTO })
  @UseGuards(ConnectionEditGuard)
  @Post('/table/action/:slug')
  async createAction(
    @SlugUuid() connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @QueryTableName() tableName: string,
    @Body('title') title: string,
    @Body('url') url: string,
    @Body('icon') icon: string,
    @Body('type') type: TableActionTypeEnum,
  ): Promise<CreatedTableActionDS> {
    const inputData: CreateTableActionDS = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      userId: userId,
      tableName: tableName,
      title: title,
      url: url,
      type: type,
      icon: icon,
    };
    this.validateTableAction(inputData);
    return await this.createTableActionUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Update table action' })
  @ApiResponse({ status: 200, description: 'Table action successfully updated' })
  @ApiBody({ type: UpdateTableActionDTO })
  @UseGuards(ConnectionEditGuard)
  @Put('/table/action/:slug')
  async updateAction(
    @Query('actionId') actionId: string,
    @Body('title') title: string,
    @Body('url') url: string,
    @Body('icon') icon: string,
    @Body('type') type: TableActionTypeEnum,
  ): Promise<CreatedTableActionDS> {
    const inputData: UpdateTableActionDS = {
      actionId: actionId,
      title: title,
      url: url,
      type: type,
      icon: icon,
    };
    this.validateTableAction(inputData);
    return await this.updateTableActionUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Delete table action' })
  @ApiResponse({ status: 201, description: 'Table action successfully deleted' })
  @UseGuards(ConnectionEditGuard)
  @Delete('/table/action/:slug')
  async deleteAction(@Query('actionId') actionId: string): Promise<CreatedTableActionDS> {
    return await this.deleteTableActionUseCase.execute(actionId, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Activate table action' })
  @ApiResponse({ status: 201, description: 'Table action successfully activated' })
  @ApiBody({ type: CreateTableActionDTO })
  @UseGuards(ConnectionReadGuard)
  @Post('/table/action/activate/:slug')
  async activateAction(
    @SlugUuid() connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @QueryTableName() tableName: string,
    @Query('actionId') actionId: string,
    @Body() body: Record<string, unknown>,
  ): Promise<void | { location: string } > {
    const inputData: ActivateTableActionDS = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      userId: userId,
      tableName: tableName,
      actionId: actionId,
      request_body: body,
    };

    return await this.activateTableActionUseCase.execute(inputData, InTransactionEnum.OFF);
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
