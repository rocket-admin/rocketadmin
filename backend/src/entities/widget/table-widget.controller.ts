import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Injectable,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword, QueryTableName, SlugUuid, UserId } from '../../decorators/index.js';
import { InTransactionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { ConnectionEditGuard, ConnectionReadGuard } from '../../guards/index.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { CreateTableWidgetsDs } from './application/data-sctructures/create-table-widgets.ds.js';
import { FindTableWidgetsDs } from './application/data-sctructures/find-table-widgets.ds.js';
import { FoundTableWidgetsDs } from './application/data-sctructures/found-table-widgets.ds.js';
import { CreateOrUpdateTableWidgetsDto } from './dto/index.js';
import { TableWidgetRO } from './table-widget.interface.js';
import { ICreateUpdateDeleteTableWidgets, IFindTableWidgets } from './use-cases/table-widgets-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('Table widget')
@Injectable()
export class TableWidgetController {
  constructor(
    @Inject(UseCaseType.FIND_TABLE_WIDGETS)
    private readonly findTableWidgetsUseCase: IFindTableWidgets,
    @Inject(UseCaseType.CREATE_UPDATE_DELETE_TABLE_WIDGETS)
    private readonly createUpdateDeleteTableWidgetsUseCase: ICreateUpdateDeleteTableWidgets,
  ) {}

  @UseGuards(ConnectionReadGuard)
  @ApiOperation({ summary: 'Find all table widgets' })
  @ApiResponse({
    status: 200,
    description: 'Table widgets found.',
    type: Array<TableWidgetRO>,
  })
  @ApiQuery({ name: 'tableName', required: true })
  @Get('/widgets/:connectionId')
  @UseInterceptors(ClassSerializerInterceptor)
  async findAll(
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @QueryTableName() tableName: string,
  ): Promise<Array<TableWidgetRO>> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const inputData: FindTableWidgetsDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      tableName: tableName,
      userId: userId,
    };
    return await this.findTableWidgetsUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @UseGuards(ConnectionEditGuard)
  @ApiOperation({ summary: 'Create new table widget' })
  @ApiResponse({
    status: 201,
    description: 'Table widget created.',
    type: Array<TableWidgetRO>,
  })
  @ApiBody({ type: CreateOrUpdateTableWidgetsDto })
  @ApiQuery({ name: 'tableName', required: true })
  @Post('/widget/:connectionId')
  @UseInterceptors(ClassSerializerInterceptor)
  async createOrUpdateTableWidgets(
    @QueryTableName() tableName: string,
    @Body() tableWidgetsData: CreateOrUpdateTableWidgetsDto,
    @SlugUuid('connectionId') connectionId: string,
    @MasterPassword() masterPwd: string,
    @UserId() userId: string,
  ): Promise<Array<FoundTableWidgetsDs>> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: CreateTableWidgetsDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      tableName: tableName,
      userId: userId,
      widgets: tableWidgetsData.widgets,
    };
    return await this.createUpdateDeleteTableWidgetsUseCase.execute(inputData, InTransactionEnum.ON);
  }
}
