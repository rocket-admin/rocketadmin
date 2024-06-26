import { UseInterceptors, Controller, Injectable, UseGuards, Post, Inject, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SentryInterceptor } from '../../../interceptors/sentry.interceptor.js';
import { ConnectionReadGuard } from '../../../guards/connection-read.guard.js';
import { SlugUuid } from '../../../decorators/slug-uuid.decorator.js';
import { MasterPassword } from '../../../decorators/master-password.decorator.js';
import { UserId } from '../../../decorators/user-id.decorator.js';
import { FoundTableActionWithEventsAndRulesDto } from '../application/dto/found-table-action-with-events-and-rules.dto.js';
import { UseCaseType } from '../../../common/data-injection.tokens.js';
import { ICreateTableActionV2 } from './use-cases/table-actions-v2-use-cases.interface.js';
import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { CreateTableActionWithEventAndRuleDS } from '../application/data-structures/create-table-action-with-event-and-rule.ds.js';
import { CreateTableActionBodyDataDto } from '../application/dto/create-table-action-body-data.dto.js';

@UseInterceptors(SentryInterceptor)
@Controller('v2')
@ApiBearerAuth()
@ApiTags('table actions v2')
@Injectable()
export class TableActionV2Controller {
  constructor(
    @Inject(UseCaseType.CREATE_TABLE_ACTION_V2)
    private readonly createTableActionUseCase: ICreateTableActionV2,
  ) {}

  @ApiOperation({ summary: 'Create table action with rules and events' })
  @ApiResponse({
    status: 200,
    description: 'Return created table action.',
    type: FoundTableActionWithEventsAndRulesDto,
  })
  @ApiBody({ type: CreateTableActionBodyDataDto })
  @UseGuards(ConnectionReadGuard)
  @Post('/table/action/:connectionId')
  async findTableActions(
    @SlugUuid('connectionId') connectionId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
    @Body() createTableActionData: CreateTableActionBodyDataDto,
  ): Promise<any> {
    const inputData: CreateTableActionWithEventAndRuleDS = {
      connection_data: {
        connectionId,
        masterPwd,
        userId,
      },
      table_action_data: {
        action_emails: createTableActionData.table_action.emails,
        action_method: createTableActionData.table_action.action_method,
        action_type: createTableActionData.table_action.action_type,
        action_url: createTableActionData.table_action.url,
        action_slack_url: createTableActionData.table_action.slack_url,
      },
      action_rules_data: createTableActionData.action_rules.map((rule) => ({
        table_name: rule.table_name,
        title: rule.title,
        events_data: rule.action_events.map((event_data) => ({
          event: event_data.event,
          event_title: event_data.title,
          icon: event_data.icon,
          require_confirmation: event_data.require_confirmation,
        })),
      })),
    };

    return await this.createTableActionUseCase.execute(inputData, InTransactionEnum.ON);
  }
}
