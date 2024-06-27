import { UseInterceptors, Controller, Injectable, UseGuards, Inject, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SentryInterceptor } from '../../../interceptors/sentry.interceptor.js';
import { ConnectionEditGuard } from '../../../guards/connection-edit.guard.js';
import { UseCaseType } from '../../../common/data-injection.tokens.js';
import { SlugUuid } from '../../../decorators/slug-uuid.decorator.js';
import { CreateTableActionRuleBodyDTO } from './application/dto/create-table-triggers-body.dto.js';
import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { CreateActionRuleDS } from './application/data-structures/create-action-rules.ds.js';
import { UserId } from '../../../decorators/user-id.decorator.js';
import { MasterPassword } from '../../../decorators/master-password.decorator.js';
import { ICreateActionRule } from './use-cases/action-rules-use-cases.interface.js';
import { FoundActionRulesWithActionsAndEventsDTO } from './application/dto/found-table-triggers-with-actions.dto.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('action rules')
@Injectable()
export class ActionRulesController {
  constructor(
    @Inject(UseCaseType.CREATE_ACTION_RULES)
    private readonly createTableActionRule: ICreateActionRule,
  ) {}

  @ApiOperation({ summary: 'Create rules for table' })
  @ApiResponse({
    status: 200,
    description: 'Return created rules table.',
    type: FoundActionRulesWithActionsAndEventsDTO,
    isArray: false,
  })
  @ApiBody({ type: CreateTableActionRuleBodyDTO })
  @UseGuards(ConnectionEditGuard)
  @Post('/table/rule/:connectionId')
  async createTriggers(
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
    return await this.createTableActionRule.execute(inputData, InTransactionEnum.OFF);
  }
}
