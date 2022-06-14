import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateOrUpdateTableWidgetsDto, CreateTableWidgetDto } from './dto';
import { getCognitoUserName, getMasterPwd } from '../../helpers';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { IRequestWithCognitoInfo } from '../../authorization';
import { ITableWidgetRO } from './table-widget.interface';
import { Messages } from '../../exceptions/text/messages';
import { SentryInterceptor } from '../../interceptors';
import { ConnectionEditGuard, ConnectionReadGuard } from '../../guards';
import { UseCaseType } from '../../common/data-injection.tokens';
import { ICreateUpdateDeleteTableWidgets, IFindTableWidgets } from './use-cases/table-widgets-use-cases.interface';
import { FindTableWidgetsDs } from './application/data-sctructures/find-table-widgets.ds';
import { CreateTableWidgetsDs } from './application/data-sctructures/create-table-widgets.ds';
import { FoundTableWidgetsDs } from './application/data-sctructures/found-table-widgets.ds';

@ApiBearerAuth()
@ApiTags('table_widgets')
@UseInterceptors(SentryInterceptor)
@Controller()
export class TableWidgetController {
  constructor(
    @Inject(UseCaseType.FIND_TABLE_WIDGETS)
    private readonly findTableWidgetsUseCase: IFindTableWidgets,
    @Inject(UseCaseType.CREATE_UPDATE_DELETE_TABLE_WIDGETS)
    private readonly createUpdateDeleteTableWidgetsUseCase: ICreateUpdateDeleteTableWidgets,
  ) {}

  @ApiOperation({ summary: 'Get all table widgets' })
  @ApiResponse({ status: 200, description: 'Return all table widgets' })
  @UseGuards(ConnectionReadGuard)
  @Get('/widgets/:slug')
  @UseInterceptors(ClassSerializerInterceptor)
  async findAll(
    @Req() request: IRequestWithCognitoInfo,
    @Param() params,
    @Query('tableName') tableName: string,
  ): Promise<Array<ITableWidgetRO>> {
    const connectionId = params.slug;
    const cognitoUserName = getCognitoUserName(request);
    const masterPwd = getMasterPwd(request);
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!tableName || tableName.length === 0) {
      throw new HttpException(
        {
          message: Messages.TABLE_NAME_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: FindTableWidgetsDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      tableName: tableName,
      userId: cognitoUserName,
    };
    return await this.findTableWidgetsUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Create new table widget' })
  @ApiResponse({ status: 201, description: 'Return table settings with created table widget' })
  @ApiBody({ type: CreateOrUpdateTableWidgetsDto })
  @UseGuards(ConnectionEditGuard)
  @Post('/widget/:slug')
  @UseInterceptors(ClassSerializerInterceptor)
  async createOrUpdateTableWidgets(
    @Req() request: IRequestWithCognitoInfo,
    @Param() params,
    @Query('tableName') tableName: string,
    @Body('widgets') widgets: Array<CreateTableWidgetDto>,
  ): Promise<Array<FoundTableWidgetsDs>> {
    const connectionId = params.slug;
    const masterPwd = getMasterPwd(request);
    const cognitoUserName = getCognitoUserName(request);
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!tableName || tableName.length === 0) {
      throw new HttpException(
        {
          message: Messages.TABLE_NAME_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: CreateTableWidgetsDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      tableName: tableName,
      userId: cognitoUserName,
      widgets: widgets,
    };
    return await this.createUpdateDeleteTableWidgetsUseCase.execute(inputData);
  }
}
