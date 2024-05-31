import {
  UseInterceptors,
  Controller,
  Injectable,
  UseGuards,
  Inject,
  Get,
  Post,
  Body,
  Put,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { QueryTableName } from '../../decorators/query-table-name.decorator.js';
import { ConnectionEditGuard } from '../../guards/connection-edit.guard.js';
import { FoundTableTriggersWithActionsDTO } from './application/dto/found-table-triggers-with-actions.dto.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import {
  ICreateTableTriggers,
  IDeleteTableTriggers,
  IFindAllTableTriggers,
  IUpdateTableTriggers,
} from './use-cases/table-triggers-use-cases.interface.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { CreateTableTriggersBodyDTO } from './application/dto/create-table-triggers-body.dto.js';
import { CreateTableTriggersDS } from './application/data-structures/create-table-triggers.ds.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { UpdateTableTriggersDS } from './application/data-structures/update-table-triggers.ds.js';
import { Messages } from '../../exceptions/text/messages.js';
import { QueryUuid } from '../../decorators/query-uuid.decorator.js';

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
    @Inject(UseCaseType.UPDATE_TABLE_TRIGGERS)
    private readonly updateTableTriggersUseCase: IUpdateTableTriggers,
    @Inject(UseCaseType.DELETE_TABLE_TRIGGERS)
    private readonly deleteTableTriggersUseCase: IDeleteTableTriggers,
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
    isArray: false,
  })
  @ApiBody({ type: CreateTableTriggersBodyDTO })
  @UseGuards(ConnectionEditGuard)
  @Post('/table/triggers/:connectionId')
  async createTriggers(
    @Body() createTableTriggerData: CreateTableTriggersBodyDTO,
    @SlugUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
  ): Promise<FoundTableTriggersWithActionsDTO> {
    const { actions_ids, trigger_events } = createTableTriggerData;
    const inputData: CreateTableTriggersDS = {
      actions_ids,
      trigger_events,
      connectionId,
      tableName,
    };
    return await this.createTableTriggersUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Update table trigger' })
  @ApiResponse({
    status: 200,
    description: 'Return created triggers table.',
    type: FoundTableTriggersWithActionsDTO,
    isArray: false,
  })
  @ApiBody({ type: CreateTableTriggersBodyDTO })
  @UseGuards(ConnectionEditGuard)
  @Put('/table/triggers/:connectionId')
  async updateTrigger(
    @Body() createTableTriggerData: CreateTableTriggersBodyDTO,
    @QueryUuid('triggersId') triggersId: string,
  ): Promise<FoundTableTriggersWithActionsDTO> {
    const { actions_ids, trigger_events } = createTableTriggerData;
    const inputData: UpdateTableTriggersDS = {
      actions_ids,
      trigger_events,
      triggersId,
    };
    return await this.updateTableTriggersUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Delete table trigger' })
  @ApiResponse({
    status: 200,
    description: 'Return created triggers table.',
    type: FoundTableTriggersWithActionsDTO,
    isArray: false,
  })
  @UseGuards(ConnectionEditGuard)
  @Delete('/table/triggers/:connectionId')
  async deleteTrigger(@QueryUuid('triggersId') triggersId: string): Promise<FoundTableTriggersWithActionsDTO> {
    if (!triggersId) {
      throw new BadRequestException(Messages.REQUIRED_PARAMETERS_MISSING(['triggersId']));
    }
    return await this.deleteTableTriggersUseCase.execute(triggersId, InTransactionEnum.OFF);
  }
}
