import { UseInterceptors, Controller, Injectable, UseGuards, Post, Inject, Body, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SentryInterceptor } from '../../../interceptors/sentry.interceptor.js';
import { ConnectionReadGuard } from '../../../guards/connection-read.guard.js';
import { SlugUuid } from '../../../decorators/slug-uuid.decorator.js';
import { MasterPassword } from '../../../decorators/master-password.decorator.js';
import { UserId } from '../../../decorators/user-id.decorator.js';
import { FoundTableActionWithEventsAndRulesDto } from '../application/dto/found-table-action-with-events-and-rules.dto.js';
import { UseCaseType } from '../../../common/data-injection.tokens.js';
import { ICreateTableActionV2, IGetTableActionV2 } from './use-cases/table-actions-v2-use-cases.interface.js';
import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { CreateTableActionWithEventAndRuleDS } from '../application/data-structures/create-table-action-with-event-and-rule.ds.js';
import { CreateTableActionBodyDataDto } from '../application/dto/create-table-action-body-data.dto.js';
import { ConnectionEditGuard } from '../../../guards/connection-edit.guard.js';
import { QueryTableName } from '../../../decorators/query-table-name.decorator.js';

@UseInterceptors(SentryInterceptor)
@Controller('v2')
@ApiBearerAuth()
@ApiTags('table actions v2')
@Injectable()
export class TableActionV2Controller {
  constructor(
    @Inject(UseCaseType.CREATE_TABLE_ACTION_V2)
    private readonly createTableActionUseCase: ICreateTableActionV2,
    @Inject(UseCaseType.GET_TABLE_ACTION_V2)
    private readonly getTableActionUseCase: IGetTableActionV2,
  ) {}

  @ApiOperation({ summary: 'Create table action with rules and events' })
  @ApiResponse({
    status: 200,
    description: 'Return created table action.',
    type: FoundTableActionWithEventsAndRulesDto,
  })
  @ApiBody({ type: CreateTableActionBodyDataDto })
  @UseGuards(ConnectionEditGuard)
  @Post('/table/action/:connectionId')
  public async findTableActions(
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

  @ApiOperation({ summary: 'Find table actions with rules and events' })
  @ApiResponse({
    status: 200,
    description: 'Return found table actions.',
    type: FoundTableActionWithEventsAndRulesDto,
    isArray: true,
  })
  @UseGuards(ConnectionReadGuard)
  @Get('/table/actions/:connectionId')
  public async getAllTableActionForTable(
    @SlugUuid('connectionId') connectionId: string,
    @QueryTableName() tableName: string,
    @MasterPassword() masterPwd: string,
    @UserId() userId: string,
  ): Promise<Array<FoundTableActionWithEventsAndRulesDto>> {
    return await this.getTableActionUseCase.execute({
      connectionId,
      masterPwd,
      userId,
      tableName,
    });
  }
}
