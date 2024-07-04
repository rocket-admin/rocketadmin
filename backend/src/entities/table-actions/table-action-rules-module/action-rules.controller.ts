import {
  UseInterceptors,
  Controller,
  Injectable,
  UseGuards,
  Inject,
  Post,
  Body,
  Get,
  Delete,
  Put,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SentryInterceptor } from '../../../interceptors/sentry.interceptor.js';
import { ConnectionEditGuard } from '../../../guards/connection-edit.guard.js';
import { UseCaseType } from '../../../common/data-injection.tokens.js';
import { SlugUuid } from '../../../decorators/slug-uuid.decorator.js';
import { CreateTableActionRuleBodyDTO } from './application/dto/create-action-rules-with-actions-and-events-body.dto.js';
import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { CreateActionRuleDS } from './application/data-structures/create-action-rules.ds.js';
import { UserId } from '../../../decorators/user-id.decorator.js';
import { MasterPassword } from '../../../decorators/master-password.decorator.js';
import {
  IActivateTableActionsInRule,
  ICreateActionRule,
  IDeleteActionRuleInTable,
  IFindActionRuleById,
  IFindActionRulesForTable,
  IFindCustomEvents,
  IUpdateActionRule,
} from './use-cases/action-rules-use-cases.interface.js';
import {
  FoundActionEventDTO,
  FoundActionRulesWithActionsAndEventsDTO,
} from './application/dto/found-action-rules-with-actions-and-events.dto.js';
import { ConnectionReadGuard } from '../../../guards/connection-read.guard.js';
import { QueryTableName } from '../../../decorators/query-table-name.decorator.js';
import { UpdateTableActionRuleBodyDTO } from './application/dto/update-action-rule-with-actions-and-events.dto.js';
import { UpdateActionRuleDS } from './application/data-structures/update-action-rule.ds.js';
import { ActivatedTableActionsDTO } from './application/dto/activated-table-actions.dto.js';
import { ActivateEventActionsDS } from './application/data-structures/activate-rule-actions.ds.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { FoundTableActionRulesRoDTO } from './application/dto/found-table-action-rules.ro.dto.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('action rules')
@Injectable()
export class ActionRulesController {
  constructor(
    @Inject(UseCaseType.CREATE_ACTION_RULES)
    private readonly createTableActionRuleUseCase: ICreateActionRule,
    @Inject(UseCaseType.FIND_ACTION_RULES_FOR_TABLE)
    private readonly findActionRulesForTableUseCase: IFindActionRulesForTable,
    @Inject(UseCaseType.DELETE_ACTION_RULE_IN_TABLE)
    private readonly deleteActionRuleInTableUseCase: IDeleteActionRuleInTable,
    @Inject(UseCaseType.FIND_ACTION_RULE_BY_ID)
    private readonly findActionRuleByIdUseCase: IFindActionRuleById,
    @Inject(UseCaseType.UPDATE_ACTION_RULE)
    private readonly updateTableActionRuleUseCase: IUpdateActionRule,
    @Inject(UseCaseType.FIND_ACTION_RULE_CUSTOM_EVENTS)
    private readonly findCustomEventsUseCase: IFindCustomEvents,
    @Inject(UseCaseType.ACTIVATE_TABLE_ACTIONS_IN_EVENT)
    private readonly activateTableActionsInRuleUseCase: IActivateTableActionsInRule,
  ) {}

  @ApiOperation({ summary: 'Create rules for table' })
  @ApiResponse({
    status: 200,
    description: 'Return created rules for table.',
    type: FoundActionRulesWithActionsAndEventsDTO,
    isArray: false,
  })
  @ApiBody({ type: CreateTableActionRuleBodyDTO })
  @UseGuards(ConnectionEditGuard)
  @Post('/action/rule/:connectionId')
  async createActionRule(
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @Body() tableRuleData: CreateTableActionRuleBodyDTO,
  ): Promise<FoundActionRulesWithActionsAndEventsDTO> {
    const inputData: CreateActionRuleDS = {
      connection_data: {
        connectionId,
        masterPwd,
        userId,
      },
      action_events_data: tableRuleData.events.map((event) => ({
        event: event.event,
        event_title: event.title,
        icon: event.icon,
        require_confirmation: event.require_confirmation,
      })),
      rule_data: {
        rule_title: tableRuleData.title,
        table_name: tableRuleData.table_name,
      },
      table_actions_data: tableRuleData.table_actions.map((action) => ({
        action_type: action.type,
        action_url: action.url,
        action_method: action.method,
        action_slack_url: action.slack_url,
        action_emails: action.emails,
      })),
    };
    return await this.createTableActionRuleUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Get rules for table' })
  @ApiResponse({
    status: 200,
    description: 'Return found rules for table with action and events.',
    type: FoundTableActionRulesRoDTO,
    isArray: true,
  })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(ConnectionReadGuard)
  @Get('/action/rules/:connectionId')
  async findActionRulesForTableWithEventsAndActions(
    @SlugUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
  ): Promise<FoundTableActionRulesRoDTO> {
    return await this.findActionRulesForTableUseCase.execute({ connectionId, tableName });
  }

  @ApiOperation({ summary: 'Get custom rules for table' })
  @ApiResponse({
    status: 200,
    description: 'Return found rules for table with action and events.',
    type: FoundActionEventDTO,
    isArray: true,
  })
  @ApiQuery({ name: 'tableName', required: true })
  @UseGuards(ConnectionReadGuard)
  @Get('/action/events/custom/:connectionId')
  async findCustomEvents(
    @SlugUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
  ): Promise<Array<FoundActionEventDTO>> {
    return await this.findCustomEventsUseCase.execute({ connectionId, tableName });
  }

  @ApiOperation({ summary: 'Delete rule in table' })
  @ApiResponse({
    status: 200,
    description: 'Delete rule in table with actions and events. Return deleted.',
    type: FoundActionRulesWithActionsAndEventsDTO,
    isArray: false,
  })
  @UseGuards(ConnectionEditGuard)
  @Delete('/action/rule/:ruleId/:connectionId')
  async deleteActionRuleInTableWithEventsAndActions(
    @SlugUuid('connectionId') connectionId: string,
    @SlugUuid('ruleId') ruleId: string,
  ): Promise<FoundActionRulesWithActionsAndEventsDTO> {
    return await this.deleteActionRuleInTableUseCase.execute({ connectionId, ruleId }, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Find rule by id' })
  @ApiResponse({
    status: 200,
    description: 'Find rule by id.',
    type: FoundActionRulesWithActionsAndEventsDTO,
    isArray: false,
  })
  @UseGuards(ConnectionReadGuard)
  @Get('/action/rule/:ruleId/:connectionId')
  async findActionRuleInTableWithEventsAndActionsById(
    @SlugUuid('connectionId') connectionId: string,
    @SlugUuid('ruleId') ruleId: string,
  ): Promise<FoundActionRulesWithActionsAndEventsDTO> {
    return await this.findActionRuleByIdUseCase.execute({ connectionId, ruleId });
  }

  @ApiOperation({ summary: 'Update rule' })
  @ApiResponse({
    status: 200,
    description: 'Return update rule for table.',
    type: FoundActionRulesWithActionsAndEventsDTO,
    isArray: false,
  })
  @ApiBody({ type: UpdateTableActionRuleBodyDTO })
  @UseGuards(ConnectionEditGuard)
  @Put('/action/rule/:ruleId/:connectionId')
  async createTriggers(
    @SlugUuid('connectionId') connectionId: string,
    @SlugUuid('ruleId') ruleId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @Body() tableRuleData: UpdateTableActionRuleBodyDTO,
  ): Promise<FoundActionRulesWithActionsAndEventsDTO> {
    const inputData: UpdateActionRuleDS = {
      connection_data: {
        connectionId,
        masterPwd,
        userId,
      },
      action_events_data: tableRuleData.events.map((event) => ({
        event: event.event,
        event_title: event.title,
        icon: event.icon,
        require_confirmation: event.require_confirmation,
        event_id: event.id,
      })),
      rule_data: {
        rule_id: ruleId,
        rule_title: tableRuleData.title,
        table_name: tableRuleData.table_name,
      },
      table_actions_data: tableRuleData.table_actions.map((action) => ({
        action_type: action.type,
        action_url: action.url,
        action_method: action.method,
        action_slack_url: action.slack_url,
        action_emails: action.emails,
        action_id: action.id,
      })),
    };
    return await this.updateTableActionRuleUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Activate all actions with custom event in this rule' })
  @ApiResponse({
    status: 200,
    description: 'Return action activation result.',
    type: ActivatedTableActionsDTO,
    isArray: true,
  })
  @ApiBody({ type: Object })
  @UseGuards(ConnectionReadGuard)
  @Post('/event/actions/activate/:eventId/:connectionId')
  async activateTableActionsInRule(
    @SlugUuid('connectionId') connectionId: string,
    @SlugUuid('eventId') eventId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @Body() body: Array<Record<string, unknown>>,
  ): Promise<ActivatedTableActionsDTO> {
    if (!Array.isArray(body)) {
      throw new BadRequestException(Messages.MUST_CONTAIN_ARRAY_OF_PRIMARY_KEYS);
    }
    body.forEach((item) => {
      if (typeof item !== 'object') {
        throw new BadRequestException(Messages.MUST_CONTAIN_ARRAY_OF_PRIMARY_KEYS);
      }
    });
    const inputData: ActivateEventActionsDS = {
      connection_data: {
        connectionId,
        masterPwd,
        userId,
      },
      event_id: eventId,
      request_body: body,
    };
    return await this.activateTableActionsInRuleUseCase.execute(inputData);
  }
}
