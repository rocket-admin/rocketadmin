import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SentryInterceptor } from '../../../interceptors/sentry.interceptor.js';
import { UseCaseType } from '../../../common/data-injection.tokens.js';
import {
  ICreateUpdatePersonalTableSettings,
  IDeletePersonalTableSettings,
  IFindPersonalTableSettings,
} from './use-cases/personal-table-settings.use-cases.interface.js';
import { TableReadGuard } from '../../../guards/table-read.guard.js';
import { UserId } from '../../../decorators/user-id.decorator.js';
import { QueryTableName } from '../../../decorators/query-table-name.decorator.js';
import { MasterPassword } from '../../../decorators/master-password.decorator.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { FindPersonalTableSettingsDs } from './data-structures/find-personal-table-settings.ds.js';
import { FoundPersonalTableSettingsDto } from './dto/found-personal-table-settings.dto.js';
import { SlugUuid } from '../../../decorators/slug-uuid.decorator.js';
import { CreatePersonalTableSettingsDs } from './data-structures/create-personal-table-settings.ds.js';
import { CreatePersonalTableSettingsDto } from './dto/create-personal-table-settings.dto.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('Personal table settings')
@Injectable()
export class PersonalTableSettingsController {
  constructor(
    @Inject(UseCaseType.FIND_PERSONAL_TABLE_SETTINGS)
    private readonly findPersonalTableSettingsUseCase: IFindPersonalTableSettings,
    @Inject(UseCaseType.CREATE_UPDATE_PERSONAL_TABLE_SETTINGS)
    private readonly createUpdatePersonalTableSettingsUseCase: ICreateUpdatePersonalTableSettings,
    @Inject(UseCaseType.DELETE_PERSONAL_TABLE_SETTINGS)
    private readonly deletePersonalTableSettingsUseCase: IDeletePersonalTableSettings,
  ) {}

  @ApiOperation({ summary: 'Find user personal table settings' })
  @ApiResponse({
    status: 200,
    description: 'Table settings found.',
    type: FoundPersonalTableSettingsDto,
  })
  @ApiParam({ name: 'connectionId', required: true })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(TableReadGuard)
  @Get('/settings/personal/:connectionId')
  async findAll(
    @SlugUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
    @MasterPassword() masterPwd: string,
    @UserId() userId: string,
  ): Promise<FoundPersonalTableSettingsDto> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: FindPersonalTableSettingsDs = {
      connectionId,
      tableName,
      userId,
      masterPassword: masterPwd,
    };
    return await this.findPersonalTableSettingsUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Create or update user personal table settings' })
  @ApiResponse({
    status: 200,
    description: 'Table settings crated/updated.',
    type: FoundPersonalTableSettingsDto,
  })
  @ApiBody({ type: CreatePersonalTableSettingsDto })
  @ApiParam({ name: 'connectionId', required: true })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(TableReadGuard)
  @Put('/settings/personal/:connectionId')
  async createOrUpdate(
    @SlugUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
    @MasterPassword() masterPwd: string,
    @UserId() userId: string,
    @Body() personalSettingsData: CreatePersonalTableSettingsDto,
  ): Promise<FoundPersonalTableSettingsDto> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: CreatePersonalTableSettingsDs = {
      table_settings_metadata: {
        connection_id: connectionId,
        table_name: tableName,
        user_id: userId,
        master_password: masterPwd,
      },
      table_settings_data: {
        columns_view: personalSettingsData.columns_view || null,
        list_fields: personalSettingsData.list_fields || null,
        list_per_page: personalSettingsData.list_per_page || null,
        ordering: personalSettingsData.ordering || null,
        ordering_field: personalSettingsData.ordering_field || null,
        original_names: personalSettingsData.original_names || null,
      },
    };
    return await this.createUpdatePersonalTableSettingsUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Clear user personal table settings' })
  @ApiResponse({
    status: 200,
    description: 'Table settings removed.',
    type: FoundPersonalTableSettingsDto,
  })
  @ApiParam({ name: 'connectionId', required: true })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(TableReadGuard)
  @Delete('/settings/personal/:connectionId')
  async clearTableSettings(
    @SlugUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
    @MasterPassword() masterPwd: string,
    @UserId() userId: string,
  ): Promise<FoundPersonalTableSettingsDto> {
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: FindPersonalTableSettingsDs = {
      connectionId,
      tableName,
      userId,
      masterPassword: masterPwd,
    };
    return await this.deletePersonalTableSettingsUseCase.execute(inputData, InTransactionEnum.OFF);
  }
}
