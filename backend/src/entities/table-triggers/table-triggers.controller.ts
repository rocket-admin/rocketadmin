import { UseInterceptors, Controller, Injectable, UseGuards, Inject, Get, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { QueryTableName } from '../../decorators/query-table-name.decorator.js';
import { ConnectionEditGuard } from '../../guards/connection-edit.guard.js';
import { FoundTableTriggersWithActionsDTO } from './application/dto/found-table-triggers-with-actions.dto.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { ICreateTableTriggers, IFindAllTableTriggers } from './use-cases/table-triggers-use-cases.interface.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { CreateTableTriggersBodyDTO } from './application/dto/create-table-triggers-body.dto.js';
import { CreateTableTriggersDS } from './application/data-structures/create-table-triggers.ds.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { MasterPassword } from '../../decorators/master-password.decorator.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('table triggers')
@Injectable()
export class TableTriggersController {
  constructor(
    @Inject(UseCaseType.FIND_TABLE_TRIGGERS)
    private readonly findAllTableTriggersUseCase: IFindAllTableTriggers,
    @Inject(UseCaseType.CREATE_TABLE_TRIGGERS)
    private readonly createTableTriggersUseCase: ICreateTableTriggers,
  ) {}

  @ApiOperation({ summary: 'Get all table triggers for this table' })
  @ApiResponse({
    status: 200,
    description: 'Return all triggers for this table.',
    type: FoundTableTriggersWithActionsDTO,
    isArray: true,
  })
  @UseGuards(ConnectionEditGuard)
  @Get('/table/triggers/:connectionId')
  async findAll(
    @SlugUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
  ): Promise<FoundTableTriggersWithActionsDTO[]> {
    return await this.findAllTableTriggersUseCase.execute({ connectionId, tableName });
  }

  @ApiOperation({ summary: 'Create triggers for table' })
  @ApiResponse({
    status: 200,
    description: 'Return created triggers table.',
    type: FoundTableTriggersWithActionsDTO,
    isArray: true,
  })
  @ApiBody({ type: CreateTableTriggersBodyDTO })
  @UseGuards(ConnectionEditGuard)
  @Post('/table/triggers/:connectionId')
  async createTriggers(
    @Body() createTableTriggerData: CreateTableTriggersBodyDTO,
    @SlugUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
    @MasterPassword() masterPwd: string,
  ): Promise<FoundTableTriggersWithActionsDTO[]> {
    const { actions_ids, trigger_events } = createTableTriggerData;
    const inputData: CreateTableTriggersDS = {
      actions_ids,
      trigger_events,
      connectionId,
      tableName,
      masterPwd,
    };
    return await this.createTableTriggersUseCase.execute(inputData, InTransactionEnum.ON);
  }
}
