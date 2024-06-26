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
import { SentryInterceptor } from '../../../interceptors/sentry.interceptor.js';
import { QueryTableName } from '../../../decorators/query-table-name.decorator.js';
import { ConnectionEditGuard } from '../../../guards/connection-edit.guard.js';
import { FoundTableTriggersWithActionsDTO } from './application/dto/found-table-triggers-with-actions.dto.js';
import { UseCaseType } from '../../../common/data-injection.tokens.js';
import {
  ICreateTableTriggers,
  IDeleteTableTriggers,
  IFindAllTableTriggers,
  IFindTableTrigger,
  IUpdateTableTriggers,
} from './use-cases/table-triggers-use-cases.interface.js';
import { SlugUuid } from '../../../decorators/slug-uuid.decorator.js';
import { CreateTableTriggersBodyDTO } from './application/dto/create-table-triggers-body.dto.js';
import { CreateTableTriggersDS } from './application/data-structures/create-table-triggers.ds.js';
import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { UpdateTableTriggersDS } from './application/data-structures/update-table-triggers.ds.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { QueryUuid } from '../../../decorators/query-uuid.decorator.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('action rules')
@Injectable()
export class ActionRulesController {
  constructor(
    @Inject(UseCaseType.FIND_ACTION_RULES)
    private readonly findAllTableTriggersUseCase: IFindAllTableTriggers,
    @Inject(UseCaseType.FIND_ACTION_RULES)
    private readonly findTableTriggerUseCase: IFindTableTrigger,
    @Inject(UseCaseType.CREATE_ACTION_RULES)
    private readonly createTableTriggersUseCase: ICreateTableTriggers,
    @Inject(UseCaseType.UPDATE_ACTION_RULES)
    private readonly updateTableTriggersUseCase: IUpdateTableTriggers,
    @Inject(UseCaseType.DELETE_ACTION_RULE)
    private readonly deleteTableTriggersUseCase: IDeleteTableTriggers,
  ) {}

  @ApiOperation({ summary: 'Get all action rules for this table' })
  @ApiResponse({
    status: 200,
    description: 'Return all rules for this table.',
    type: FoundTableTriggersWithActionsDTO,
    isArray: true,
  })
  @UseGuards(ConnectionEditGuard)
  @Get('/table/rules/:connectionId')
  async findAll(
    @SlugUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
  ): Promise<FoundTableTriggersWithActionsDTO[]> {
    return await this.findAllTableTriggersUseCase.execute({ connectionId, tableName });
  }

  @ApiOperation({ summary: 'Get action rules by id' })
  @ApiResponse({
    status: 200,
    description: 'Return all rules for this table.',
    type: FoundTableTriggersWithActionsDTO,
    isArray: false,
  })
  @UseGuards(ConnectionEditGuard)
  @Get('/table/rules/:connectionId')
  async findOneTrigger(@QueryUuid('triggerId') triggerId: string): Promise<FoundTableTriggersWithActionsDTO> {
    return await this.findTableTriggerUseCase.execute(triggerId);
  }

  @ApiOperation({ summary: 'Create rules for table' })
  @ApiResponse({
    status: 200,
    description: 'Return created rules table.',
    type: FoundTableTriggersWithActionsDTO,
    isArray: false,
  })
  @ApiBody({ type: CreateTableTriggersBodyDTO })
  @UseGuards(ConnectionEditGuard)
  @Post('/table/rules/:connectionId')
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
    description: 'Return created rules table.',
    type: FoundTableTriggersWithActionsDTO,
    isArray: false,
  })
  @ApiBody({ type: CreateTableTriggersBodyDTO })
  @UseGuards(ConnectionEditGuard)
  @Put('/table/rules/:connectionId/')
  async updateTrigger(
    @Body() createTableTriggerData: CreateTableTriggersBodyDTO,
    @QueryUuid('ruleId') triggersId: string,
    @QueryTableName() tableName: string,
  ): Promise<FoundTableTriggersWithActionsDTO> {
    const { actions_ids, trigger_events } = createTableTriggerData;
    const inputData: UpdateTableTriggersDS = {
      actions_ids,
      trigger_events,
      triggersId,
      table_name: tableName,
    };
    return await this.updateTableTriggersUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Delete table rule' })
  @ApiResponse({
    status: 200,
    description: 'Return created triggers rule.',
    type: FoundTableTriggersWithActionsDTO,
    isArray: false,
  })
  @UseGuards(ConnectionEditGuard)
  @Delete('/table/triggers/:connectionId')
  async deleteTrigger(@QueryUuid('ruleId') triggersId: string): Promise<FoundTableTriggersWithActionsDTO> {
    if (!triggersId) {
      throw new BadRequestException(Messages.REQUIRED_PARAMETERS_MISSING(['ruleId']));
    }
    return await this.deleteTableTriggersUseCase.execute(triggersId, InTransactionEnum.OFF);
  }
}
