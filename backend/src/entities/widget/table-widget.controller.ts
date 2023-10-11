import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Injectable,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword, QueryTableName, SlugUuid, UserId } from '../../decorators/index.js';
import { InTransactionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { ConnectionEditGuard, ConnectionReadGuard } from '../../guards/index.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { CreateTableWidgetsDs } from './application/data-sctructures/create-table-widgets.ds.js';
import { FindTableWidgetsDs } from './application/data-sctructures/find-table-widgets.ds.js';
import { FoundTableWidgetsDs } from './application/data-sctructures/found-table-widgets.ds.js';
import { CreateTableWidgetDto } from './dto/index.js';
import { TableWidgetRO } from './table-widget.interface.js';
import { ICreateUpdateDeleteTableWidgets, IFindTableWidgets } from './use-cases/table-widgets-use-cases.interface.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('table widgets')
@Injectable()
export class TableWidgetController {
  constructor(
    @Inject(UseCaseType.FIND_TABLE_WIDGETS)
    private readonly findTableWidgetsUseCase: IFindTableWidgets,
    @Inject(UseCaseType.CREATE_UPDATE_DELETE_TABLE_WIDGETS)
    private readonly createUpdateDeleteTableWidgetsUseCase: ICreateUpdateDeleteTableWidgets,
  ) {}

  @UseGuards(ConnectionReadGuard)
  @ApiOperation({ summary: 'Get all table widgets' })
  @ApiResponse({
    status: 200,
    description: 'Return all table widgets',
    type: Array<TableWidgetRO>,
  })
  @Get('/widgets/:slug')
  @UseInterceptors(ClassSerializerInterceptor)
  async findAll(
    @SlugUuid() connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @Param() params,
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
    description: 'Return table settings with created table widget',
    type: Array<TableWidgetRO>,
  })
  @ApiBody({ type: Array<CreateTableWidgetDto> })
  @Post('/widget/:slug')
  @UseInterceptors(ClassSerializerInterceptor)
  async createOrUpdateTableWidgets(
    @QueryTableName() tableName: string,
    @Body('widgets') widgets: Array<CreateTableWidgetDto>,
    @SlugUuid() connectionId: string,
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
      widgets: widgets,
    };
    return await this.createUpdateDeleteTableWidgetsUseCase.execute(inputData, InTransactionEnum.ON);
  }
}
