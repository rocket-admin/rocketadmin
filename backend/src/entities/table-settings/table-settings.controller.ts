import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Injectable,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword, QueryTableName, QueryUuid, UserId } from '../../decorators/index.js';
import { InTransactionEnum, QueryOrderingEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { ConnectionEditGuard, ConnectionReadGuard } from '../../guards/index.js';
import { toPrettyErrorsMsg } from '../../helpers/index.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { CustomFieldsEntity } from '../custom-field/custom-fields.entity.js';
import { CreateTableSettingsDs } from './application/data-structures/create-table-settings.ds.js';
import { DeleteTableSettingsDs } from './application/data-structures/delete-table-settings.ds.js';
import { FindTableSettingsDs } from './application/data-structures/find-table-settings.ds.js';
import { FoundTableSettingsDs } from './application/data-structures/found-table-settings.ds.js';
import { CreateTableSettingsDto } from './dto/index.js';
import {
  ICreateTableSettings,
  IDeleteTableSettings,
  IFindTableSettings,
  IUpdateTableSettings,
} from './use-cases/use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('Table settings')
@Injectable()
export class TableSettingsController {
  constructor(
    @Inject(UseCaseType.FIND_TABLE_SETTINGS)
    private readonly findTableSettingsUseCase: IFindTableSettings,
    @Inject(UseCaseType.CREATE_TABLE_SETTINGS)
    private readonly createTableSettingsUseCase: ICreateTableSettings,
    @Inject(UseCaseType.UPDATE_TABLE_SETTINGS)
    private readonly updateTableSettingsUseCase: IUpdateTableSettings,
    @Inject(UseCaseType.DELETE_TABLE_SETTINGS)
    private readonly deleteTableSettingsUseCase: IDeleteTableSettings,
  ) {}

  @ApiOperation({ summary: 'Find all table settings in this connection' })
  @ApiResponse({
    status: 200,
    description: 'Table settings found.',
    type: FoundTableSettingsDs,
  })
  @ApiQuery({ name: 'connectionId', required: true })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(ConnectionReadGuard)
  @Get('/settings/')
  @UseInterceptors(ClassSerializerInterceptor)
  async findAll(
    @QueryUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
    @MasterPassword() masterPwd: string,
  ): Promise<FoundTableSettingsDs> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const inputData: FindTableSettingsDs = {
      connectionId: connectionId,
      tableName: tableName,
      masterPassword: masterPwd,
    };
    return await this.findTableSettingsUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Create new table settings' })
  @ApiBody({ type: CreateTableSettingsDs })
  @ApiResponse({
    status: 201,
    description: 'Table settings created.',
    type: FoundTableSettingsDs,
  })
  @ApiQuery({ name: 'connectionId', required: true })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(ConnectionEditGuard)
  @Post('/settings/')
  async createSettings(
    @QueryUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,

    @Body('search_fields') search_fields: Array<string>,
    @Body('display_name') display_name: string,
    @Body('excluded_fields') excluded_fields: Array<string>,
    @Body('list_fields') list_fields: Array<string>,
    @Body('identification_fields') identification_fields: Array<string>,
    @Body('list_per_page') list_per_page: number,
    @Body('ordering') ordering: QueryOrderingEnum,
    @Body('ordering_field') ordering_field: string,
    @Body('readonly_fields') readonly_fields: Array<string>,
    @Body('sensitive_fields') sensitive_fields: Array<string>,
    @Body('sortable_by') sortable_by: Array<string>,
    @Body('autocomplete_columns') autocomplete_columns: Array<string>,
    @Body('customFields') customFields: Array<CustomFieldsEntity>,
    @Body('columns_view') columns_view: Array<string>,
    @Body('identity_column') identity_column: string,
    @Body('can_delete') can_delete: boolean,
    @Body('can_update') can_update: boolean,
    @Body('can_add') can_add: boolean,
    @Body('icon') icon: string,
    @Body('allow_csv_export') allow_csv_export: boolean,
    @Body('allow_csv_import') allow_csv_import: boolean,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<FoundTableSettingsDs> {
    const inputData: CreateTableSettingsDs = {
      table_name: tableName,
      display_name: display_name,
      connection_id: connectionId,
      search_fields: search_fields,
      excluded_fields: excluded_fields,
      list_fields: list_fields,
      list_per_page: list_per_page,
      ordering: ordering,
      ordering_field: ordering_field,
      readonly_fields: readonly_fields,
      sortable_by: sortable_by,
      autocomplete_columns: autocomplete_columns,
      custom_fields: customFields,
      identification_fields: identification_fields,
      sensitive_fields: sensitive_fields,
      columns_view: columns_view,
      identity_column: identity_column,
      masterPwd: masterPwd,
      userId: userId,
      table_widgets: undefined,
      can_delete: can_delete,
      can_update: can_update,
      can_add: can_add,
      icon: icon,
      allow_csv_export: allow_csv_export,
      allow_csv_import: allow_csv_import,
    };

    const errors = this.validateParameters(inputData);
    if (errors.length > 0) {
      throw new HttpException(
        {
          message: toPrettyErrorsMsg(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.createTableSettingsUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Update table settings' })
  @ApiBody({ type: CreateTableSettingsDs })
  @ApiResponse({
    status: 200,
    description: 'Table settings updated.',
    type: FoundTableSettingsDs,
  })
  @ApiQuery({ name: 'connectionId', required: true })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(ConnectionEditGuard)
  @Put('/settings/')
  async updateSettings(
    @QueryUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,

    @Body('search_fields') search_fields: Array<string>,
    @Body('display_name') display_name: string,
    @Body('excluded_fields') excluded_fields: Array<string>,
    @Body('list_fields') list_fields: Array<string>,
    @Body('identification_fields') identification_fields: Array<string>,
    @Body('list_per_page') list_per_page: number,
    @Body('ordering') ordering: QueryOrderingEnum,
    @Body('ordering_field') ordering_field: string,
    @Body('readonly_fields') readonly_fields: Array<string>,
    @Body('sensitive_fields') sensitive_fields: Array<string>,
    @Body('sortable_by') sortable_by: Array<string>,
    @Body('autocomplete_columns') autocomplete_columns: Array<string>,
    @Body('customFields') customFields: Array<CustomFieldsEntity>,
    @Body('columns_view') columns_view: Array<string>,
    @Body('identity_column') identity_column: string,
    @Body('can_delete') can_delete: boolean,
    @Body('can_update') can_update: boolean,
    @Body('can_add') can_add: boolean,
    @Body('icon') icon: string,
    @Body('allow_csv_export') allow_csv_export: boolean,
    @Body('allow_csv_import') allow_csv_import: boolean,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<FoundTableSettingsDs> {
    const inputData: CreateTableSettingsDs = {
      autocomplete_columns: autocomplete_columns,
      columns_view: columns_view,
      connection_id: connectionId,
      custom_fields: customFields,
      display_name: display_name,
      excluded_fields: excluded_fields,
      identification_fields: identification_fields,
      identity_column: identity_column,
      list_fields: list_fields,
      list_per_page: list_per_page,
      masterPwd: masterPwd,
      ordering: ordering,
      ordering_field: ordering_field,
      readonly_fields: readonly_fields,
      search_fields: search_fields,
      sensitive_fields: sensitive_fields,
      sortable_by: sortable_by,
      table_name: tableName,
      userId: userId,
      can_delete: can_delete,
      can_update: can_update,
      can_add: can_add,
      icon: icon,
      allow_csv_export: allow_csv_export,
      allow_csv_import: allow_csv_import,
    };

    const errors = this.validateParameters(inputData);
    if (errors.length > 0) {
      throw new HttpException(
        {
          message: toPrettyErrorsMsg(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.updateTableSettingsUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Delete table settings' })
  @ApiBody({ type: CreateTableSettingsDs })
  @ApiResponse({
    status: 200,
    description: 'Table settings deleted.',
    type: FoundTableSettingsDs,
  })
  @ApiQuery({ name: 'connectionId', required: true })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(ConnectionEditGuard)
  @Delete('/settings/')
  async deleteSettings(
    @QueryUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
  ): Promise<FoundTableSettingsDs> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: DeleteTableSettingsDs = {
      connectionId: connectionId,
      tableName: tableName,
    };
    return await this.deleteTableSettingsUseCase.execute(inputData, InTransactionEnum.ON);
  }

  private validateParameters(tableSettingsDTO: CreateTableSettingsDto): Array<string> {
    const errors = [];
    if (!tableSettingsDTO.table_name) {
      errors.push(Messages.TABLE_NAME_MISSING);
    }
    if (!tableSettingsDTO.connection_id) {
      errors.push(Messages.CONNECTION_ID_MISSING);
    }
    return errors;
  }
}
