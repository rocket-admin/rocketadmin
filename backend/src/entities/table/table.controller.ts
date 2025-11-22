import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ParseFilePipeBuilder,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiProperty, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { getDataAccessObject } from '@rocketadmin/shared-code/src/data-access-layer/shared/create-data-access-object.js';
import { IGlobalDatabaseContext } from '../../common/application/global-database-context.interface.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword, QueryTableName, SlugUuid, UserId } from '../../decorators/index.js';
import { AmplitudeEventTypeEnum, InTransactionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { TableAddGuard, TableDeleteGuard, TableEditGuard, TableReadGuard } from '../../guards/index.js';
import { TablesReceiveGuard } from '../../guards/tables-receive.guard.js';
import { Constants } from '../../helpers/constants/constants.js';
import { isConnectionTypeAgent, isObjectEmpty } from '../../helpers/index.js';
import { isObjectPropertyExists } from '../../helpers/validators/is-object-property-exists-validator.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { SuccessResponse } from '../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { AmplitudeService } from '../amplitude/amplitude.service.js';
import { AddRowInTableDs } from './application/data-structures/add-row-in-table.ds.js';
import { DeleteRowFromTableDs, DeleteRowsFromTableDs } from './application/data-structures/delete-row-from-table.ds.js';
import { DeletedRowFromTableDs } from './application/data-structures/deleted-row-from-table.ds.js';
import { FindTablesDs } from './application/data-structures/find-tables.ds.js';
import { FoundTableRowsDs } from './application/data-structures/found-table-rows.ds.js';
import { FoundTableDs, FoundTablesWithCategoriesDS } from './application/data-structures/found-table.ds.js';
import { GetRowByPrimaryKeyDs } from './application/data-structures/get-row-by-primary-key.ds.js';
import { GetTableRowsDs } from './application/data-structures/get-table-rows.ds.js';
import { GetTableStructureDs } from './application/data-structures/get-table-structure-ds.js';
import { ImportCSVInTableDs } from './application/data-structures/import-scv-in-table.ds.js';
import { UpdateRowInTableDs } from './application/data-structures/update-row-in-table.ds.js';
import { UpdateRowsInTableDs } from './application/data-structures/update-rows-in-table.ds.js';
import { FindAllRowsWithBodyFiltersDto } from './dto/find-rows-with-body-filters.dto.js';
import { UpdateRowsDto } from './dto/update-rows.dto.js';
import { TableRowRODs, TableStructureDs } from './table-datastructures.js';
import {
  IAddRowInTable,
  IBulkUpdateRowsInTable,
  IDeleteRowFromTable,
  IDeleteRowsFromTable,
  IExportCSVFromTable,
  IFindTablesInConnection,
  IFindTablesInConnectionV2,
  IGetRowByPrimaryKey,
  IGetTableRows,
  IGetTableStructure,
  IImportCSVFinTable,
  IUpdateRowInTable,
} from './use-cases/table-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('Table')
@Injectable()
export class TableController {
  constructor(
    private readonly amplitudeService: AmplitudeService,
    @Inject(UseCaseType.FIND_TABLES_IN_CONNECTION)
    private readonly findTablesInConnectionUseCase: IFindTablesInConnection,
    @Inject(UseCaseType.FIND_TABLES_IN_CONNECTION_V2)
    private readonly findTablesInConnectionV2UseCase: IFindTablesInConnectionV2,
    @Inject(UseCaseType.GET_ALL_TABLE_ROWS)
    private readonly getTableRowsUseCase: IGetTableRows,
    @Inject(UseCaseType.GET_TABLE_STRUCTURE)
    private readonly getTableStructureUseCase: IGetTableStructure,
    @Inject(UseCaseType.ADD_ROW_IN_TABLE)
    private readonly addRowInTableUseCase: IAddRowInTable,
    @Inject(UseCaseType.UPDATE_ROW_IN_TABLE)
    private readonly updateRowInTableUseCase: IUpdateRowInTable,
    @Inject(UseCaseType.BULK_UPDATE_ROWS_IN_TABLE)
    private readonly bulkUpdateRowsInTableUseCase: IBulkUpdateRowsInTable,
    @Inject(UseCaseType.DELETE_ROW_FROM_TABLE)
    private readonly deleteRowFromTableUseCase: IDeleteRowFromTable,
    @Inject(UseCaseType.GET_ROW_BY_PRIMARY_KEY)
    private readonly getRowByPrimaryKeyUseCase: IGetRowByPrimaryKey,
    @Inject(UseCaseType.DELETE_ROWS_FROM_TABLE)
    private readonly deleteRowsFromTableUseCase: IDeleteRowsFromTable,
    @Inject(UseCaseType.EXPORT_CSV_FROM_TABLE)
    private readonly exportCSVFromTableUseCase: IExportCSVFromTable,
    @Inject(UseCaseType.IMPORT_CSV_TO_TABLE)
    private readonly importCSVToTableUseCase: IImportCSVFinTable,
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {}

  @ApiOperation({
    summary: 'Find tables in connection. API+',
    description: 'Return all found tables in connection. Support access with api key.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tables found.',
    type: FoundTableDs,
    isArray: true,
  })
  @UseGuards(TablesReceiveGuard)
  @Get('/connection/tables/:connectionId')
  @ApiQuery({ name: 'hidden', required: false })
  async findTablesInConnection(
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @Query('hidden') hidden_tables: string,
  ): Promise<Array<FoundTableDs>> {
    const hiddenTablesOption = hidden_tables === 'true';
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: FindTablesDs = {
      connectionId: connectionId,
      hiddenTablesOption: hiddenTablesOption,
      masterPwd: masterPwd,
      userId: userId,
    };
    return await this.findTablesInConnectionUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({
    summary: 'Find tables in connection. API+',
    description: 'Return all found tables in connection with categories. Support access with api key.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tables found.',
    type: FoundTablesWithCategoriesDS,
    isArray: false,
  })
  @UseGuards(TablesReceiveGuard)
  @Get('/connection/tables/v2/:connectionId')
  @ApiQuery({ name: 'hidden', required: false })
  async findTablesInConnectionV2(
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @Query('hidden') hidden_tables: string,
  ): Promise<FoundTablesWithCategoriesDS> {
    const hiddenTablesOption = hidden_tables === 'true';
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: FindTablesDs = {
      connectionId: connectionId,
      hiddenTablesOption: hiddenTablesOption,
      masterPwd: masterPwd,
      userId: userId,
    };
    return await this.findTablesInConnectionV2UseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Get all table rows. API+', deprecated: true, description: 'Deprecated' })
  @ApiResponse({
    status: 200,
    description: 'Returns all table rows.',
    type: FoundTableRowsDs,
  })
  @UseGuards(TableReadGuard)
  @ApiQuery({ name: 'tableName', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'search', required: false })
  @Get('/table/rows/:connectionId')
  async findAllRows(
    @QueryTableName() tableName: string,
    @Query('page') page: any,
    @Query('perPage') perPage: any,
    @Query('search') searchingFieldValue: string,
    @Query() query,
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<FoundTableRowsDs> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (page && perPage) {
      page = parseInt(page);
      perPage = parseInt(perPage);
      if ((page && page <= 0) || (perPage && perPage <= 0)) {
        throw new HttpException(
          {
            message: Messages.PAGE_AND_PERPAGE_INVALID,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const inputData: GetTableRowsDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      page: page,
      perPage: perPage,
      query: query,
      searchingFieldValue: searchingFieldValue,
      tableName: tableName,
      userId: userId,
    };
    return await this.getTableRowsUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({
    summary: 'Get all table rows with filter parameters in body. API+',
    description: 'Return all found table rows. Support access with api key. Support search, filtering and pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Table rows found.',
    type: FoundTableRowsDs,
  })
  @ApiBody({ type: FindAllRowsWithBodyFiltersDto })
  @ApiQuery({ name: 'tableName', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'search', required: false })
  @UseGuards(TableReadGuard)
  @Post('/table/rows/find/:connectionId')
  async findAllRowsWithBodyFilter(
    @QueryTableName() tableName: string,
    @Query('page') page: any,
    @Query('perPage') perPage: any,
    @Query('search') searchingFieldValue: string,
    @Query() query,
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @Body() body: FindAllRowsWithBodyFiltersDto,
  ): Promise<FoundTableRowsDs> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (page && perPage) {
      page = parseInt(page);
      perPage = parseInt(perPage);
      if ((page && page <= 0) || (perPage && perPage <= 0)) {
        throw new HttpException(
          {
            message: Messages.PAGE_AND_PERPAGE_INVALID,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const inputData: GetTableRowsDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      page: page,
      perPage: perPage,
      query: query,
      searchingFieldValue: searchingFieldValue,
      tableName: tableName,
      userId: userId,
      filters: body?.filters,
    };
    return await this.getTableRowsUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({
    summary: 'Get table structure. API+',
    description: 'Return table structure. Support access with api key.',
  })
  @ApiResponse({
    status: 200,
    description: 'Table structure found.',
    type: TableStructureDs,
  })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(TableReadGuard)
  @Get('/table/structure/:connectionId')
  async getTableStructure(
    @QueryTableName() tableName: string,
    @UserId() userId: string,
    @SlugUuid('connectionId') connectionId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<TableStructureDs> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: GetTableStructureDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      tableName: tableName,
      userId: userId,
    };
    return await this.getTableStructureUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({
    summary: 'Add new row in table. API+',
    description: 'Add new row in table. Support access with api key.',
  })
  @ApiBody({ type: Object })
  @ApiResponse({
    status: 201,
    description: 'New row added.',
    type: TableRowRODs,
  })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(TableAddGuard)
  @Post('/table/row/:connectionId')
  async addRowInTable(
    @Body() body: Record<string, unknown>,
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @QueryTableName() tableName: string,
  ): Promise<TableRowRODs | boolean> {
    if (!connectionId || isObjectEmpty(body)) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: AddRowInTableDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      row: body,
      tableName: tableName,
      userId: userId,
    };
    return await this.addRowInTableUseCase.execute(inputData, InTransactionEnum.OFF);
  }
  @ApiOperation({
    summary: 'Update row in table by primary key. API+',
    description: 'Update row in table by primary key (if table has primary key). Support access with api key.',
  })
  @ApiBody({ type: Object })
  @ApiResponse({
    status: 200,
    description: 'Row updated.',
    type: TableRowRODs,
  })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(TableEditGuard)
  @Put('/table/row/:connectionId')
  async updateRowInTable(
    @Body() body: string,
    @Query() query: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @SlugUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
  ): Promise<TableRowRODs> {
    if (!connectionId || !body) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const primaryKeys = await this.getPrimaryKeys(userId, connectionId, tableName, query, masterPwd);
    const propertiesArray = primaryKeys.map((el) => {
      return Object.entries(el)[0];
    });

    const primaryKey = Object.fromEntries(propertiesArray);
    const inputData: UpdateRowInTableDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      primaryKey: primaryKey,
      row: body as unknown as Record<string, unknown>,
      tableName: tableName,
      userId: userId,
    };
    return await this.updateRowInTableUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({
    summary: 'Delete row from table by primary key. API+',
    description: 'Delete row from table by primary key (if table has primary key). Support access with api key.',
  })
  @ApiResponse({
    status: 200,
    description: 'Row deleted.',
    type: DeletedRowFromTableDs,
  })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(TableDeleteGuard)
  @Delete('/table/row/:connectionId')
  async deleteRowInTable(
    @Query() query: string,
    @MasterPassword() masterPwd: string,
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @QueryTableName() tableName: string,
  ): Promise<DeletedRowFromTableDs> {
    const primaryKeys = await this.getPrimaryKeys(userId, connectionId, tableName, query, masterPwd);
    const propertiesArray = primaryKeys.map((el) => {
      return Object.entries(el)[0];
    });
    const primaryKey = Object.fromEntries(propertiesArray);

    if (!connectionId || !tableName || !primaryKey) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: DeleteRowFromTableDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      primaryKey: primaryKey,
      tableName: tableName,
      userId: userId,
    };
    return await this.deleteRowFromTableUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({
    summary: 'Multiple delete rows from table by primary key. API+',
    description: 'Remove multiple rows from table. Support access with api key.',
  })
  @ApiResponse({
    status: 200,
    description: 'Rows deleted.',
    type: Object,
    isArray: true,
  })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(TableDeleteGuard)
  @Put('/table/rows/delete/:connectionId')
  async deleteRowsInTable(
    @MasterPassword() masterPwd: string,
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @QueryTableName() tableName: string,
    @Body() body: Array<Record<string, unknown>>,
  ): Promise<boolean> {
    if (!connectionId || !tableName) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!Array.isArray(body)) {
      throw new HttpException(
        {
          message: Messages.MUST_CONTAIN_ARRAY_OF_PRIMARY_KEYS,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: DeleteRowsFromTableDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      primaryKeys: body,
      tableName: tableName,
      userId: userId,
    };
    return await this.deleteRowsFromTableUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({
    summary: 'Multiple update rows in table by primary key. API+',
    description: 'Set new values to several rows. Support access with api key.',
  })
  @ApiResponse({
    status: 200,
    description: 'Rows updated.',
    type: SuccessResponse,
  })
  @ApiBody({ type: UpdateRowsDto })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(TableEditGuard)
  @Put('/table/rows/update/:connectionId')
  async updateRowsInTable(
    @MasterPassword() masterPwd: string,
    @QueryTableName() tableName: string,
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @Body() body: UpdateRowsDto,
  ): Promise<SuccessResponse> {
    if (!connectionId || !tableName) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const { newValues, primaryKeys } = body;
    const inputData: UpdateRowsInTableDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      tableName: tableName,
      userId: userId,
      primaryKeys: primaryKeys,
      newValues: newValues,
    };
    return await this.bulkUpdateRowsInTableUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({
    summary: 'Find row in table by primary key. API+',
    description: 'Return row by primary key. Support access with api key.',
  })
  @ApiResponse({
    status: 200,
    description: 'Row found.',
    type: TableRowRODs,
  })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(TableReadGuard)
  @Get('/table/row/:connectionId')
  async getRowByPrimaryKey(
    @Query() query: string,
    @MasterPassword() masterPwd: string,
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @QueryTableName() tableName: string,
  ): Promise<TableRowRODs> {
    const primaryKeys = await this.getPrimaryKeys(userId, connectionId, tableName, query, masterPwd);

    const propertiesArray = primaryKeys.map((el) => {
      return Object.entries(el)[0];
    });
    const primaryKey = Object.fromEntries(propertiesArray);
    if (!connectionId || !primaryKey) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const inputData: GetRowByPrimaryKeyDs = {
        connectionId: connectionId,
        masterPwd: masterPwd,
        primaryKey: primaryKey,
        tableName: tableName,
        userId: userId,
      };
      return await this.getRowByPrimaryKeyUseCase.execute(inputData, InTransactionEnum.OFF);
    } catch (e) {
      throw e;
    } finally {
      const isTest = await this._dbContext.connectionRepository.isTestConnectionById(connectionId);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.tableRowReceivedTest : AmplitudeEventTypeEnum.tableRowReceived,
        userId,
      );
    }
  }

  @ApiOperation({
    summary: 'Export table as csv file. API+',
    description:
      'Export data from table as csv file. Support search, filtering and pagination. Support access with api key.',
  })
  @ApiResponse({
    status: 201,
    description: 'Data exported.',
  })
  @ApiBody({ type: FindAllRowsWithBodyFiltersDto })
  @ApiQuery({ name: 'tableName', required: true })
  @ApiProperty({ name: 'page', required: false })
  @ApiProperty({ name: 'perPage', required: false })
  @ApiProperty({ name: 'search', required: false })
  @UseGuards(TableReadGuard)
  @Post('/table/csv/export/:connectionId')
  async exportCSVFromTable(
    @QueryTableName() tableName: string,
    @Query('page') page: any,
    @Query('perPage') perPage: any,
    @Query('search') searchingFieldValue: string,
    @Query() query,
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @Body() body: FindAllRowsWithBodyFiltersDto,
  ): Promise<StreamableFile> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (page && perPage) {
      page = parseInt(page);
      perPage = parseInt(perPage);
      if ((page && page <= 0) || (perPage && perPage <= 0)) {
        throw new HttpException(
          {
            message: Messages.PAGE_AND_PERPAGE_INVALID,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const inputData: GetTableRowsDs = {
      connectionId: connectionId,
      masterPwd: masterPwd,
      page: page,
      perPage: perPage,
      query: query,
      searchingFieldValue: searchingFieldValue,
      tableName: tableName,
      userId: userId,
      filters: body?.filters,
    };
    return await this.exportCSVFromTableUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({
    summary: 'Import csv file in table. API+',
    description: 'Import data from csv file in table. Support access with api key.',
  })
  @ApiResponse({
    status: 201,
    description: 'Import csv file in table.',
    type: SuccessResponse,
  })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(TableEditGuard)
  @Post('/table/csv/import/:connectionId')
  @UseInterceptors(FileInterceptor('file'))
  async importCSVFromTable(
    @QueryTableName() tableName: string,
    @SlugUuid('connectionId') connectionId: string,
    @MasterPassword() masterPwd: string,
    @UserId() userId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: 'text/csv', skipMagicNumbersValidation: true })
        .addMaxSizeValidator({ maxSize: Constants.MAX_FILE_SIZE_IN_BYTES })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ): Promise<SuccessResponse> {
    if (!file) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: ImportCSVInTableDs = {
      connectionId: connectionId,
      file: file,
      tableName: tableName,
      materPwd: masterPwd,
      userId: userId,
    };
    await this.importCSVToTableUseCase.execute(inputData, InTransactionEnum.OFF);
    return {
      success: true,
    };
  }

  private async getPrimaryKeys(
    userId: string,
    connectionId: string,
    tableName: string,
    query: string,
    masterPwd: string,
  ): Promise<Array<any>> {
    const primaryKeys = [];
    const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
    let userEmail: string;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
    }
    const dao = getDataAccessObject(connection);

    const tablesInConnection = await dao.getTablesFromDB(userEmail);
    const tableNames = tablesInConnection.map((table) => table.tableName);
    if (!tableNames.includes(tableName)) {
      throw new HttpException(
        {
          message: Messages.TABLE_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const primaryColumns = await dao.getTablePrimaryColumns(tableName, userEmail);

    for (const primaryColumn of primaryColumns) {
      let property = {};
      if (isObjectPropertyExists(primaryColumn, 'column_name')) {
        property = {
          [primaryColumn.column_name]: query[primaryColumn.column_name],
        };
      }
      primaryKeys.push(property);
    }
    return primaryKeys;
  }
}
