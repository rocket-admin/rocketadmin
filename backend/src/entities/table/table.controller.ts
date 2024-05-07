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
  StreamableFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipeBuilder,
  UploadedFile,
} from '@nestjs/common';
import { IGlobalDatabaseContext } from '../../common/application/global-database-context.interface.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { MasterPassword, QueryTableName, SlugUuid, UserId } from '../../decorators/index.js';
import { AmplitudeEventTypeEnum, InTransactionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { TableAddGuard, TableDeleteGuard, TableEditGuard, TableReadGuard } from '../../guards/index.js';
import { isConnectionTypeAgent, isObjectEmpty } from '../../helpers/index.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { AmplitudeService } from '../amplitude/amplitude.service.js';
import { AddRowInTableDs } from './application/data-structures/add-row-in-table.ds.js';
import { DeleteRowFromTableDs, DeleteRowsFromTableDs } from './application/data-structures/delete-row-from-table.ds.js';
import { DeletedRowFromTableDs } from './application/data-structures/deleted-row-from-table.ds.js';
import { FindTablesDs } from './application/data-structures/find-tables.ds.js';
import { FoundTableRowsDs } from './application/data-structures/found-table-rows.ds.js';
import { FoundTableDs } from './application/data-structures/found-table.ds.js';
import { GetRowByPrimaryKeyDs } from './application/data-structures/get-row-by-primary-key.ds.js';
import { GetTableRowsDs } from './application/data-structures/get-table-rows.ds.js';
import { GetTableStructureDs } from './application/data-structures/get-table-structure-ds.js';
import { UpdateRowInTableDs } from './application/data-structures/update-row-in-table.ds.js';
import { TableStructureDs, TableRowRODs } from './table-datastructures.js';
import {
  IAddRowInTable,
  IBulkUpdateRowsInTable,
  IDeleteRowFromTable,
  IDeleteRowsFromTable,
  IExportCSVFromTable,
  IFindTablesInConnection,
  IGetRowByPrimaryKey,
  IGetTableRows,
  IGetTableStructure,
  IImportCSVFinTable,
  IUpdateRowInTable,
} from './use-cases/table-use-cases.interface.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateRowsDto } from './dto/update-rows.dto.js';
import { UpdateRowsInTableDs } from './application/data-structures/update-rows-in-table.ds.js';
import { SuccessResponse } from '../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { FindAllRowsWithBodyFiltersDto } from './dto/find-rows-with-body-filters.dto.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { Constants } from '../../helpers/constants/constants.js';
import { ImportCSVInTableDs } from './application/data-structures/import-scv-in-table.ds.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('table')
@Injectable()
export class TableController {
  constructor(
    private readonly amplitudeService: AmplitudeService,
    @Inject(UseCaseType.FIND_TABLES_IN_CONNECTION)
    private readonly findTablesInConnectionUseCase: IFindTablesInConnection,
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

  @ApiOperation({ summary: 'Get tables from connection' })
  @ApiResponse({
    status: 200,
    description: 'Returns all tables from connection.',
    type: Array<FoundTableDs>,
  })
  @Get('/connection/tables/:slug')
  async findTablesInConnection(
    @SlugUuid() connectionId: string,
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

  @ApiOperation({ summary: 'Get all table rows' })
  @ApiResponse({
    status: 200,
    description: 'Returns all table rows.',
    type: FoundTableRowsDs,
  })
  @UseGuards(TableReadGuard)
  @Get('/table/rows/:slug')
  async findAllRows(
    @QueryTableName() tableName: string,
    @Query('page') page: any,
    @Query('perPage') perPage: any,
    @Query('search') searchingFieldValue: string,
    @Query() query,
    @SlugUuid() connectionId: string,
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

  @ApiOperation({ summary: 'Get all table rows with filter parameters in body' })
  @ApiResponse({
    status: 200,
    description: 'Returns all table rows.',
    type: FoundTableRowsDs,
  })
  @ApiBody({ type: FindAllRowsWithBodyFiltersDto })
  @UseGuards(TableReadGuard)
  @Post('/table/rows/find/:slug')
  async findAllRowsWithBodyFilter(
    @QueryTableName() tableName: string,
    @Query('page') page: any,
    @Query('perPage') perPage: any,
    @Query('search') searchingFieldValue: string,
    @Query() query,
    @SlugUuid() connectionId: string,
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
      filters: body.filters,
    };
    return await this.getTableRowsUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Get table structure' })
  @ApiResponse({
    status: 200,
    description: 'Returns table structure.',
    type: TableStructureDs,
  })
  @UseGuards(TableReadGuard)
  @Get('/table/structure/:slug')
  async getTableStructure(
    @QueryTableName() tableName: string,
    @UserId() userId: string,
    @SlugUuid() connectionId: string,
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

  @ApiOperation({ summary: 'Add row in table' })
  @ApiBody({ type: Object })
  @ApiResponse({
    status: 201,
    description: 'Add row in table.',
    type: TableRowRODs,
  })
  @UseGuards(TableAddGuard)
  @Post('/table/row/:slug')
  async addRowInTable(
    @Body() body: Record<string, unknown>,
    @Query() query: string,
    @SlugUuid() connectionId: string,
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
  @ApiOperation({ summary: 'Update row in table by primary key' })
  @ApiBody({ type: Object })
  @ApiResponse({
    status: 200,
    description: 'Update row in table.',
    type: TableRowRODs,
  })
  @UseGuards(TableEditGuard)
  @Put('/table/row/:slug')
  async updateRowInTable(
    @Body() body: string,
    @Query() query: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @SlugUuid() connectionId: string,
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

  @ApiOperation({ summary: 'Delete row from table by primary key' })
  @ApiResponse({
    status: 200,
    description: 'Delete row from table.',
    type: DeletedRowFromTableDs,
  })
  @UseGuards(TableDeleteGuard)
  @Delete('/table/row/:slug')
  async deleteRowInTable(
    @Query() query: string,
    @MasterPassword() masterPwd: string,
    @SlugUuid() connectionId: string,
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

  @ApiOperation({ summary: 'Multiple delete rows from table by primary key' })
  @ApiResponse({
    status: 200,
    description: 'Delete rows from table.',
    type: Array<Record<string, unknown>>,
  })
  @UseGuards(TableDeleteGuard)
  @Put('/table/rows/delete/:slug')
  async deleteRowsInTable(
    @MasterPassword() masterPwd: string,
    @SlugUuid() connectionId: string,
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

  @ApiOperation({ summary: 'Multiple update rows in table by primary key' })
  @ApiResponse({
    status: 200,
    description: 'Update rows in table.',
    type: UpdateRowsDto,
  })
  @UseGuards(TableEditGuard)
  @Put('/table/rows/update/:slug')
  async updateRowsInTable(
    @MasterPassword() masterPwd: string,
    @QueryTableName() tableName: string,
    @SlugUuid() connectionId: string,
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

  @ApiOperation({ summary: 'Get row from table by primary key' })
  @ApiResponse({
    status: 200,
    description: 'Get row from table.',
    type: TableRowRODs,
  })
  @UseGuards(TableReadGuard)
  @Get('/table/row/:slug')
  async getRowByPrimaryKey(
    @Query() query: string,
    @MasterPassword() masterPwd: string,
    @SlugUuid() connectionId: string,
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

  @ApiOperation({ summary: 'Export table as csv file' })
  @ApiResponse({
    status: 201,
    description: 'Export table as csv file.',
  })
  @ApiBody({ type: FindAllRowsWithBodyFiltersDto })
  @UseGuards(TableReadGuard)
  @Post('/table/csv/export/:slug')
  async exportCSVFromTable(
    @QueryTableName() tableName: string,
    @Query('page') page: any,
    @Query('perPage') perPage: any,
    @Query('search') searchingFieldValue: string,
    @Query() query,
    @SlugUuid() connectionId: string,
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
      filters: body.filters,
    };
    return await this.exportCSVFromTableUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Import csv file in table' })
  @ApiResponse({
    status: 201,
    description: 'Import csv file in table.',
  })
  // @ApiBody({ type: FindAllRowsWithBodyFiltersDto })
  @UseGuards(TableEditGuard)
  @Post('/table/csv/import/:slug')
  @UseInterceptors(FileInterceptor('file'))
  async importCSVFromTable(
    @QueryTableName() tableName: string,
    @SlugUuid() connectionId: string,
    @MasterPassword() masterPwd: string,
    @UserId() userId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: 'text/csv' })
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
    const primaryColumns = await dao.getTablePrimaryColumns(tableName, userEmail);

    for (const primaryColumn of primaryColumns) {
      let property = {};
      if (primaryColumn.hasOwnProperty('column_name')) {
        property = {
          [primaryColumn.column_name]: query[primaryColumn.column_name],
        };
      }
      primaryKeys.push(property);
    }
    return primaryKeys;
  }
}
