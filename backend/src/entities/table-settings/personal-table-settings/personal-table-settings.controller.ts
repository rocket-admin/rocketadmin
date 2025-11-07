import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SentryInterceptor } from '../../../interceptors/sentry.interceptor.js';
import { UseCaseType } from '../../../common/data-injection.tokens.js';
import {
  ICreatePersonalTableSettings,
  IDeletePersonalTableSettings,
  IFindPersonalTableSettings,
  IUpdatePersonalTableSettings,
} from './use-cases/personal-table-settings.use-cases.interface.js';
import { TableReadGuard } from '../../../guards/table-read.guard.js';
import { UserId } from '../../../decorators/user-id.decorator.js';
import { QueryUuid } from '../../../decorators/query-uuid.decorator.js';
import { QueryTableName } from '../../../decorators/query-table-name.decorator.js';
import { MasterPassword } from '../../../decorators/master-password.decorator.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { FindPersonalTableSettingsDs } from './data-structures/find-personal-table-settings.ds.js';
import { FoundPersonalTableSettingsDto } from './dto/found-personal-table-settings.dto.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('Personal table settings')
@Injectable()
export class PersonalTableSettingsController {
  constructor(
    @Inject(UseCaseType.FIND_TABLE_SETTINGS)
    private readonly findPersonalTableSettingsUseCase: IFindPersonalTableSettings,
    @Inject(UseCaseType.CREATE_TABLE_SETTINGS)
    private readonly createPersonalTableSettingsUseCase: ICreatePersonalTableSettings,
    @Inject(UseCaseType.UPDATE_TABLE_SETTINGS)
    private readonly updatePersonalTableSettingsUseCase: IUpdatePersonalTableSettings,
    @Inject(UseCaseType.DELETE_TABLE_SETTINGS)
    private readonly deletePersonalTableSettingsUseCase: IDeletePersonalTableSettings,
  ) {}

  @ApiOperation({ summary: 'Find personal users table settings' })
  @ApiResponse({
    status: 200,
    description: 'Table settings found.',
    // type: FoundTableSettingsDs,
  })
  @ApiParam({ name: 'connectionId', required: true })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(TableReadGuard)
  @Get('/settings/personal/:connectionId')
  async findAll(
    @QueryUuid('connectionId') connectionId: string,
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
}
