import { Inject, Injectable } from '@nestjs/common';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { IGlobalDatabaseContext } from '../../common/application/global-database-context.interface.js';
import { BaseType } from '../../common/data-injection.tokens.js';
import { FilterCriteriaEnum } from '../../enums/filter-criteria.enum.js';
import { QueryOrderingEnum } from '../../enums/query-ordering.enum.js';
import { TableActionEventEnum } from '../../enums/table-action-event-enum.js';
import { TableActionTypeEnum } from '../../enums/table-action-type.enum.js';
import { isTest } from '../../helpers/app/is-test.js';
import { Constants } from '../../helpers/constants/constants.js';
import { slackPostMessage } from '../../helpers/index.js';
import { CreateConnectionPropertiesDs } from '../connection-properties/application/data-structures/create-connection-properties.ds.js';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity.js';
import { buildConnectionPropertiesEntity } from '../connection-properties/utils/build-connection-properties-entity.js';
import { ConnectionEntity } from '../connection/connection.entity.js';
import { GroupEntity } from '../group/group.entity.js';
import { PermissionEntity } from '../permission/permission.entity.js';
import { buildActionEventWithRule } from '../table-actions/table-action-events-module/utils/build-action-event-with-rule.util.js';
import {
  CreateRuleDataDs,
  CreateTableActionEventDS,
} from '../table-actions/table-action-rules-module/application/data-structures/create-action-rules.ds.js';
import { buildEmptyActionRule } from '../table-actions/table-action-rules-module/utils/build-empty-action-rule.util.js';
import { CreateTableFilterDs } from '../table-filters/application/data-structures/create-table-filters.ds.js';
import { buildNewTableFiltersEntity } from '../table-filters/utils/build-new-table-filters-entity.util.js';
import { CreateTableSettingsDs } from '../table-settings/application/data-structures/create-table-settings.ds.js';
import { TableSettingsEntity } from '../table-settings/table-settings.entity.js';
import { buildNewTableSettingsEntity } from '../table-settings/utils/build-new-table-settings-entity.js';
import { buildConnectionEntitiesFromTestDtos } from '../user/utils/build-connection-entities-from-test-dtos.js';
import { buildDefaultAdminGroups } from '../user/utils/build-default-admin-groups.js';
import { buildDefaultAdminPermissions } from '../user/utils/build-default-admin-permissions.js';
import { CreateTableWidgetDs } from '../widget/application/data-sctructures/create-table-widgets.ds.js';
import { buildNewTableWidgetEntity } from '../widget/utils/build-new-table-widget-entity.js';

@Injectable()
export class DemoDataService {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {}

  public async createDemoDataForUser(userId: string): Promise<Array<ConnectionEntity>> {
    try {
      return await this.createDemoData(userId);
    } catch (error) {
      console.error(`Error during demo data creation for user with ID ${userId}:`, error);
      await slackPostMessage(`Error during demo data creation for user with ID ${userId}: ${error.message}`);
    }
  }

  private async createDemoData(userId: string): Promise<Array<ConnectionEntity>> {
    const foundUser = await this._dbContext.userRepository.findOne({
      where: { id: userId },
    });

    if (!foundUser) {
      throw new Error(`Unexpected error in demo data creation: User with ID ${userId} not found.`);
    }

    const testConnections = Constants.getTestConnectionsArr();
    const testConnectionsEntities = buildConnectionEntitiesFromTestDtos(testConnections);
    const createdTestConnections = await Promise.all(
      testConnectionsEntities.map(async (connection): Promise<ConnectionEntity> => {
        connection.author = foundUser;
        return await this._dbContext.connectionRepository.saveNewConnection(connection);
      }),
    );
    const testGroupsEntities = buildDefaultAdminGroups(foundUser, createdTestConnections);
    const createdTestGroups = await Promise.all(
      testGroupsEntities.map(async (group: GroupEntity) => {
        return await this._dbContext.groupRepository.saveNewOrUpdatedGroup(group);
      }),
    );
    const testPermissionsEntities = buildDefaultAdminPermissions(createdTestGroups);
    await Promise.all(
      testPermissionsEntities.map(async (permission: PermissionEntity) => {
        await this._dbContext.permissionRepository.saveNewOrUpdatedPermission(permission);
      }),
    );

    if (!isTest()) {
      const createdPostgresConnection = createdTestConnections.find(
        (connection) => connection.type === ConnectionTypesEnum.postgres,
      );
      if (createdPostgresConnection) {
        await this.createTestTableSettingsPostgres(createdPostgresConnection);
        await this.createConnectionPropertiesForPostgresDemoData(createdPostgresConnection);
        await this.createPostgresDemoTableActions(createdPostgresConnection);
        await this.createDemoPostgresSavedTableFilters(createdPostgresConnection);
      }
      const createdMySQLConnection = createdTestConnections.find(
        (connection) => connection.type === ConnectionTypesEnum.mysql || connection.type === ConnectionTypesEnum.mysql2,
      );
      if (createdMySQLConnection) {
        await this.createTestTableSettingsMySQL(createdMySQLConnection);
        await this.createConnectionPropertiesForMySQLDemoData(createdMySQLConnection);
        await this.createMySQLDemoTableActions(createdMySQLConnection);
        await this.createMySQLPostgresSavedTableFilters(createdMySQLConnection);
      }
    }

    return createdTestConnections;
  }

  private async createTestTableSettingsMySQL(connection: ConnectionEntity): Promise<Array<TableSettingsEntity>> {
    const tableSettingsDtos: Array<CreateTableSettingsDs> = [
      {
        table_name: 'event',
        display_name: '',
        search_fields: [],
        excluded_fields: [],
        list_fields: ['title', 'start_time', 'end_time', 'space_id', 'image_url', 'organizer_id', 'description', 'id'],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: '',
        readonly_fields: [],
        sortable_by: [],
        autocomplete_columns: ['title', 'description'],
        identification_fields: [],
        columns_view: ['space_id', 'title', 'start_time', 'end_time', 'image_url'],
        identity_column: 'title',
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: [],
        icon: 'celebration',
        allow_csv_export: true,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
      {
        table_name: 'event_attendee',
        display_name: '',
        search_fields: ['event_id', 'user_id', 'guest_name', 'guest_email', 'status'],
        excluded_fields: [],
        list_fields: ['user_id', 'guest_name', 'status', 'guest_email', 'event_id', 'created_at', 'id'],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: '',
        readonly_fields: [],
        sortable_by: [],
        autocomplete_columns: ['event_id', 'user_id', 'guest_name', 'guest_email'],
        identification_fields: [],
        columns_view: [],
        identity_column: 'user_id',
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: [],
        icon: 'groups',
        allow_csv_export: true,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
      {
        table_name: 'events',
        display_name: null,
        search_fields: [],
        excluded_fields: [],
        list_fields: [],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: null,
        readonly_fields: [],
        sortable_by: [],
        autocomplete_columns: [],
        identification_fields: [],
        columns_view: null,
        identity_column: null,
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: null,
        icon: null,
        allow_csv_export: true,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
      {
        table_name: 'location',
        display_name: '',
        search_fields: ['name', 'address', 'city', 'country'],
        excluded_fields: [],
        list_fields: [],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: '',
        readonly_fields: [],
        sortable_by: [],
        autocomplete_columns: ['name', 'address', 'city', 'country'],
        identification_fields: [],
        columns_view: ['name', 'address', 'city', 'country'],
        identity_column: 'name',
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: [],
        icon: 'domain',
        allow_csv_export: true,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
      {
        table_name: 'membership',
        display_name: '',
        search_fields: ['user_id', 'space_id', 'membership_type'],
        excluded_fields: [],
        list_fields: ['user_id', 'start_date', 'end_date', 'space_id', 'membership_type', 'id'],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: '',
        readonly_fields: [],
        sortable_by: [],
        autocomplete_columns: ['user_id', 'space_id'],
        identification_fields: [],
        columns_view: ['user_id', 'space_id', 'start_date', 'end_date', 'membership_type'],
        identity_column: 'user_id',
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: [],
        icon: 'diamond',
        allow_csv_export: true,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
      {
        table_name: 'space',
        display_name: '',
        search_fields: ['location_id', 'name', 'type', 'description'],
        excluded_fields: [],
        list_fields: ['name', 'type', 'price_per_hour', 'capacity', 'location_id', 'description', 'id'],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: '',
        readonly_fields: [],
        sortable_by: [],
        autocomplete_columns: ['location_id', 'name', 'description'],
        identification_fields: [],
        columns_view: [],
        identity_column: 'name',
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: [],
        icon: 'desk',
        allow_csv_export: true,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
      {
        table_name: 'table-1',
        display_name: '',
        search_fields: [],
        excluded_fields: [],
        list_fields: [],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: '',
        readonly_fields: [],
        sortable_by: [],
        autocomplete_columns: [],
        identification_fields: [],
        columns_view: [],
        identity_column: '',
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: [],
        icon: '',
        allow_csv_export: true,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
      {
        table_name: 'user',
        display_name: '',
        search_fields: ['name', 'email', 'phone'],
        excluded_fields: [],
        list_fields: [],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: '',
        readonly_fields: [],
        sortable_by: [],
        autocomplete_columns: ['name', 'email', 'phone'],
        identification_fields: [],
        columns_view: [],
        identity_column: 'name',
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: ['email', 'phone'],
        icon: 'person',
        allow_csv_export: true,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
    ];
    const tableSettingEntities = tableSettingsDtos.map((dto) => {
      return buildNewTableSettingsEntity(dto, connection);
    });
    const savedTableSettings = await this._dbContext.tableSettingsRepository.save(tableSettingEntities);
    await this.createDemoMySQLTablesWidgets(savedTableSettings);
    return savedTableSettings;
  }

  private async createDemoMySQLTablesWidgets(tableSettings: Array<TableSettingsEntity>): Promise<void> {
    const foundEventTableSettings = tableSettings.find((settings) => settings.table_name === 'event');
    if (foundEventTableSettings) {
      const createEventWidgetsData: Array<CreateTableWidgetDs> = [
        {
          field_name: 'organizer_id',
          widget_type: '' as any,
          name: 'Organizer',
          description: '',
          widget_params: null,
          widget_options: null,
        },
        {
          field_name: 'space_id',
          widget_type: '' as any,
          name: 'Space',
          description: '',
          widget_params: null,
          widget_options: null,
        },
        {
          field_name: 'start_time',
          widget_type: '' as any,
          name: 'Starts at',
          description: '',
          widget_params: null,
          widget_options: null,
        },
        {
          field_name: 'end_time',
          widget_type: '' as any,
          name: 'Ends at',
          description: '',
          widget_params: null,
          widget_options: null,
        },
        {
          field_name: 'title',
          widget_type: '' as any,
          name: 'Event name',
          description: '',
          widget_params: null,
          widget_options: null,
        },
        {
          field_name: 'image_url',
          widget_type: 'Image' as any,
          name: 'Poster',
          description: '',
          widget_params:
            '// provide image height in px to dispaly in table\n// prefix: optional URL prefix to prepend to image source\n// example:\n{\n  "height": 100,\n  "prefix": "https://demo-data.rocketadmin.com/mysql-demo-images/"\n}\n',
          widget_options: null,
        },
      ];
      const newWidgets = createEventWidgetsData.map((widget) => {
        const newWidget = buildNewTableWidgetEntity(widget);
        newWidget.settings = foundEventTableSettings;
        return newWidget;
      });
      await this._dbContext.tableWidgetsRepository.save(newWidgets);
    }
    const foundEventAttendeeTableSettings = tableSettings.find((settings) => settings.table_name === 'event_attendee');
    if (foundEventAttendeeTableSettings) {
      const createEventAttendeeWidgetsData: Array<CreateTableWidgetDs> = [
        {
          field_name: 'event_id',
          widget_type: '' as any,
          name: 'Event',
          description: '',
          widget_params: null,
          widget_options: null,
        },
        {
          field_name: 'user_id',
          widget_type: '' as any,
          name: 'User',
          description: '',
          widget_params: null,
          widget_options: null,
        },
        {
          field_name: 'status',
          widget_type: 'Select' as any,
          name: '',
          description: '',
          widget_params:
            '// provide array of options to map database value (key \'value\') in human readable value (key \'label\');\n// for example:\n// AK => Alaska,\n// CA => California\n\n{\n  "allow_null": true,\n  "options": [\n    {\n      "value": "confirmed",\n      "label": "⭐ Confirmed"\n    },\n    {\n      "value": "checked_in",\n      "label": "✅ Checked in"\n    },\n    {\n      "value": "cancelled",\n      "label": "❌ Cancelled"\n    }\n  ]\n}',
          widget_options: null,
        },
      ];
      const newWidgets = createEventAttendeeWidgetsData.map((widget) => {
        const newWidget = buildNewTableWidgetEntity(widget);
        newWidget.settings = foundEventAttendeeTableSettings;
        return newWidget;
      });
      await this._dbContext.tableWidgetsRepository.save(newWidgets);
    }

    const foundLocationTableSettings = tableSettings.find((settings) => settings.table_name === 'location');
    if (foundLocationTableSettings) {
      const createLocationWidgetsData: Array<CreateTableWidgetDs> = [
        {
          field_name: 'country',
          widget_type: 'Country' as any,
          name: '',
          description: '',
          widget_params:
            '// Configure country display options\n// Example:\n{\n  "show_flag": true,\n  "allow_null": false\n}\n',
          widget_options: null,
        },
      ];
      const newWidgets = createLocationWidgetsData.map((widget) => {
        const newWidget = buildNewTableWidgetEntity(widget);
        newWidget.settings = foundLocationTableSettings;
        return newWidget;
      });
      await this._dbContext.tableWidgetsRepository.save(newWidgets);
    }

    const foundMembershipTableSettings = tableSettings.find((settings) => settings.table_name === 'membership');
    if (foundMembershipTableSettings) {
      const createMembershipWidgetsData: Array<CreateTableWidgetDs> = [
        {
          field_name: 'user_id',
          widget_type: '' as any,
          name: 'User',
          description: '',
          widget_params: '',
          widget_options: null,
        },
        {
          field_name: 'space_id',
          widget_type: '' as any,
          name: 'Space',
          description: '',
          widget_params: '',
          widget_options: null,
        },
      ];
      const newWidgets = createMembershipWidgetsData.map((widget) => {
        const newWidget = buildNewTableWidgetEntity(widget);
        newWidget.settings = foundMembershipTableSettings;
        return newWidget;
      });
      await this._dbContext.tableWidgetsRepository.save(newWidgets);
    }

    const foundSpaceTableSettings = tableSettings.find((settings) => settings.table_name === 'space');
    if (foundSpaceTableSettings) {
      const createSpaceWidgetsData: Array<CreateTableWidgetDs> = [
        {
          field_name: 'type',
          widget_type: 'Select' as any,
          name: '',
          description: '',
          widget_params:
            '// provide array of options to map database value (key \'value\') in human readable value (key \'label\');\n// for example:\n// AK => Alaska,\n// CA => California\n\n{\n  "allow_null": false,\n  "options": [\n    {\n      "value": "private_office",\n      "label": "Private office"\n    },\n    {\n      "value": "meeting_room",\n      "label": "Meeting room"\n    },\n    {\n      "value": "conference_room",\n      "label": "Conference room"\n    },\n    {\n      "value": "event_stage",\n      "label": "Event stage"\n    },\n    {\n      "value": "hot_desk",\n      "label": "Hot desk"\n    }\n  ]\n}',
          widget_options: null,
        },
        {
          field_name: 'location_id',
          widget_type: '' as any,
          name: 'Location',
          description: '',
          widget_params: null,
          widget_options: null,
        },
        {
          field_name: 'price_per_hour',
          widget_type: 'Money' as any,
          name: '',
          description: '',
          widget_params:
            '// Configure money widget settings\n// example:\n{\n  "default_currency": "USD",\n  "decimal_places": 2,\n  "allow_negative": true\n}\n',
          widget_options: null,
        },
      ];
      const newWidgets = createSpaceWidgetsData.map((widget) => {
        const newWidget = buildNewTableWidgetEntity(widget);
        newWidget.settings = foundSpaceTableSettings;
        return newWidget;
      });
      await this._dbContext.tableWidgetsRepository.save(newWidgets);
    }
    const foundUserTableSettings = tableSettings.find((settings) => settings.table_name === 'user');
    if (foundUserTableSettings) {
      const createUserWidgetsData: Array<CreateTableWidgetDs> = [
        {
          field_name: 'role',
          widget_type: 'Select' as any,
          name: '',
          description: '',
          widget_params:
            '// provide array of options to map database value (key \'value\') in human readable value (key \'label\');\n// for example:\n// AK => Alaska,\n// CA => California\n\n{\n  "allow_null": false,\n  "options": [\n    {\n      "value": "admin",\n      "label": "👑 Admin"\n    },\n    {\n      "value": "organizer",\n      "label": "👩‍💻 Organizer"\n    },\n    {\n      "value": "member",\n      "label": "🙍🏻‍♂️ Member"\n    }\n  ]\n}',
          widget_options: null,
        },
        {
          field_name: 'phone',
          widget_type: 'Phone' as any,
          name: '',
          description: '',
          widget_params:
            '// Configure international phone number widget\n// example:\n{\n  "preferred_countries": ["US", "GB", "CA"],\n  "enable_placeholder": true,\n  "phone_validation": true\n}\n',
          widget_options: null,
        },
      ];
      const newWidgets = createUserWidgetsData.map((widget) => {
        const newWidget = buildNewTableWidgetEntity(widget);
        newWidget.settings = foundUserTableSettings;
        return newWidget;
      });
      await this._dbContext.tableWidgetsRepository.save(newWidgets);
    }
  }

  private async createMySQLDemoTableActions(connection: ConnectionEntity): Promise<void> {
    const actionRulesData: Array<CreateRuleDataDs> = [
      {
        table_name: 'user',
        rule_title: 'Blacklist',
      },
      {
        table_name: 'user',
        rule_title: 'Notification on new user',
      },
    ];
    const savedEmptyActionRules = [];
    for (const rule_data of actionRulesData) {
      const newActionRule = buildEmptyActionRule(rule_data, connection);
      const savedActionRule = await this._dbContext.actionRulesRepository.saveNewOrUpdatedActionRule(newActionRule);
      savedEmptyActionRules.push(savedActionRule);
    }
    const foundSavedUserBlacklistActionRule = savedEmptyActionRules.find(
      (rule) => rule.table_name === 'user' && rule.rule_title === 'Blacklist',
    );
    if (foundSavedUserBlacklistActionRule) {
      const createActionEventData: CreateTableActionEventDS = {
        event: TableActionEventEnum.CUSTOM,
        event_title: 'Blacklist',
        icon: 'do_not_disturb_on_total_silence',
        require_confirmation: true,
        type: TableActionTypeEnum.single,
      };
      const newActionEvent = buildActionEventWithRule(createActionEventData, foundSavedUserBlacklistActionRule);
      await this._dbContext.actionEventsRepository.saveNewOrUpdatedActionEvent(newActionEvent);
    }
    const foundSavedUserNotificationActionRule = savedEmptyActionRules.find(
      (rule) => rule.table_name === 'user' && rule.rule_title === 'Notification on new user',
    );
    if (foundSavedUserNotificationActionRule) {
      const createActionEventData: Array<CreateTableActionEventDS> = [
        {
          event: TableActionEventEnum.ADD_ROW,
          event_title: null,
          icon: null,
          require_confirmation: false,
          type: TableActionTypeEnum.single,
        },
        {
          event: TableActionEventEnum.UPDATE_ROW,
          event_title: null,
          icon: null,
          require_confirmation: false,
          type: TableActionTypeEnum.single,
        },
        {
          event: TableActionEventEnum.DELETE_ROW,
          event_title: null,
          icon: null,
          require_confirmation: false,
          type: TableActionTypeEnum.single,
        },
      ];
      for (const actionEventData of createActionEventData) {
        const newActionEvent = buildActionEventWithRule(actionEventData, foundSavedUserNotificationActionRule);
        await this._dbContext.actionEventsRepository.saveNewOrUpdatedActionEvent(newActionEvent);
      }
    }
  }

  private async createConnectionPropertiesForMySQLDemoData(connection: ConnectionEntity): Promise<void> {
    const createPropertiesData: CreateConnectionPropertiesDs = {
      hidden_tables: [],
      logo_url:
        'https://demo-data.rocketadmin.com/postgres-demo-images/assets_task_01k04f14nee91t3zf3kfdfhphg_1752496717_img_1-1.webp',
      primary_color: '#4CA1F7',
      secondary_color: '#E94A74',
      hostname: null,
      company_name: 'CoworkingHub',
      tables_audit: true,
      connectionId: '2e42cbbb-794c-4b9f-83b2-0951bdb0a891',
      human_readable_table_names: true,
      allow_ai_requests: true,
      default_showing_table: 'event',
      userId: connection?.author?.id || null,
      master_password: null,
      table_categories: null,
    };
    const connectionProperties = buildConnectionPropertiesEntity(createPropertiesData, connection);
    await this._dbContext.connectionPropertiesRepository.saveNewConnectionProperties(connectionProperties);
  }

  private async createPostgresDemoTableActions(connection: ConnectionEntity): Promise<void> {
    const actionRulesData: Array<CreateRuleDataDs> = [
      {
        table_name: 'certificates',
        rule_title: 'download ',
      },
      {
        table_name: 'courses',
        rule_title: 'Publish',
      },
    ];

    const savedEmptyActionRules = [];
    for (const rule_data of actionRulesData) {
      const newActionRule = buildEmptyActionRule(rule_data, connection);
      const savedActionRule = await this._dbContext.actionRulesRepository.saveNewOrUpdatedActionRule(newActionRule);
      savedEmptyActionRules.push(savedActionRule);
    }

    const foundSavedCertificatesActionRule = savedEmptyActionRules.find((rule) => rule.table_name === 'certificates');
    if (foundSavedCertificatesActionRule) {
      const createActionEventData: CreateTableActionEventDS = {
        event: TableActionEventEnum.CUSTOM,
        event_title: 'Download PDF',
        icon: 'download',
        require_confirmation: false,
        type: TableActionTypeEnum.single,
      };
      const newActionEvent = buildActionEventWithRule(createActionEventData, foundSavedCertificatesActionRule);
      await this._dbContext.actionEventsRepository.saveNewOrUpdatedActionEvent(newActionEvent);
    }

    const foundSavedCoursesActionRule = savedEmptyActionRules.find((rule) => rule.table_name === 'courses');
    if (foundSavedCoursesActionRule) {
      const createActionEventData: CreateTableActionEventDS = {
        event: TableActionEventEnum.CUSTOM,
        event_title: 'Update course data',
        icon: 'send',
        require_confirmation: true,
        type: TableActionTypeEnum.single,
      };
      const newActionEvent = buildActionEventWithRule(createActionEventData, foundSavedCoursesActionRule);
      await this._dbContext.actionEventsRepository.saveNewOrUpdatedActionEvent(newActionEvent);
    }
  }

  private async createConnectionPropertiesForPostgresDemoData(
    connection: ConnectionEntity,
  ): Promise<ConnectionPropertiesEntity> {
    const createPropertiesData: CreateConnectionPropertiesDs = {
      hidden_tables: [],
      logo_url:
        'https://demo-data.rocketadmin.com/postgres-demo-images/assets_task_01k04ftq4ce4dtg0td6g3d8x6f_1752497601_img_1-1.webp',
      primary_color: '#8CBF77',
      secondary_color: '#FB8837',
      hostname: null,
      company_name: 'School of Fish',
      tables_audit: true,
      connectionId: 'JeVyEzZY',
      human_readable_table_names: true,
      allow_ai_requests: true,
      default_showing_table: 'enrollments',
      userId: connection?.author?.id || null,
      master_password: null,
      table_categories: null,
    };
    const connectionProperties = buildConnectionPropertiesEntity(createPropertiesData, connection);
    return await this._dbContext.connectionPropertiesRepository.saveNewConnectionProperties(connectionProperties);
  }

  private async createMySQLPostgresSavedTableFilters(connection: ConnectionEntity): Promise<void> {
    const savedFiltersData: Array<CreateTableFilterDs> = [
      {
        filters: { type: { eq: 'event_stage' } },
        table_name: 'space',
        connection_id: connection.id,
        filter_name: 'Stage capacity',
        dynamic_filtered_column: { column_name: 'capacity', comparator: FilterCriteriaEnum.gt },
        masterPwd: null,
      },
      {
        filters: { type: { eq: 'hot_desk' } },
        table_name: 'space',
        connection_id: connection.id,
        filter_name: 'Hot desks',
        dynamic_filtered_column: { column_name: 'location_id', comparator: FilterCriteriaEnum.eq },
        masterPwd: null,
      },
      {
        filters: { role: { eq: 'member' } },
        table_name: 'user',
        connection_id: connection.id,
        filter_name: 'Members',
        dynamic_filtered_column: { column_name: 'email', comparator: FilterCriteriaEnum.contains },
        masterPwd: null,
      },
      {
        filters: { role: { eq: 'admin' } },
        table_name: 'user',
        connection_id: connection.id,
        filter_name: 'Admins',
        dynamic_filtered_column: { column_name: 'name', comparator: FilterCriteriaEnum.contains },
        masterPwd: null,
      },
      {
        filters: { organizer_id: { eq: 6 } },
        table_name: 'event',
        connection_id: connection.id,
        filter_name: "Fiona's events",
        dynamic_filtered_column: { column_name: 'title', comparator: FilterCriteriaEnum.contains },
        masterPwd: null,
      },
      {
        filters: { organizer_id: { eq: 3 } },
        table_name: 'event',
        connection_id: connection.id,
        filter_name: "Charlie's events",
        dynamic_filtered_column: { column_name: 'title', comparator: FilterCriteriaEnum.contains },
        masterPwd: null,
      },
    ];
    const filterEntities = savedFiltersData.map((dto) => {
      return buildNewTableFiltersEntity(dto);
    });
    await this._dbContext.tableFiltersRepository.save(filterEntities);
  }

  private async createTestTableSettingsPostgres(connection: ConnectionEntity): Promise<Array<TableSettingsEntity>> {
    const tableSettingsDtos: Array<CreateTableSettingsDs> = [
      {
        table_name: 'certificates',
        display_name: null,
        search_fields: [],
        excluded_fields: [],
        list_fields: ['user_id', 'course_id', 'certificate_url', 'issued_at', 'id'],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: '',
        readonly_fields: [],
        sortable_by: [],
        autocomplete_columns: [],
        identification_fields: [],
        columns_view: ['user_id', 'course_id', 'issued_at', 'certificate_url'],
        identity_column: 'course_id',
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: [],
        icon: 'workspace_premium',
        allow_csv_export: true,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
      {
        table_name: 'course_mentors',
        display_name: null,
        search_fields: [],
        excluded_fields: [],
        list_fields: [],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: null,
        readonly_fields: [],
        sortable_by: [],
        autocomplete_columns: [],
        identification_fields: [],
        columns_view: null,
        identity_column: 'user_id',
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: null,
        icon: 'co_present',
        allow_csv_export: true,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
      {
        table_name: 'course_modules',
        display_name: null,
        search_fields: [],
        excluded_fields: [],
        list_fields: ['position', 'title', 'course_id', 'description', 'id'],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: '',
        readonly_fields: [],
        sortable_by: [],
        autocomplete_columns: [],
        identification_fields: [],
        columns_view: [],
        identity_column: 'title',
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: [],
        icon: 'dashboard_2',
        allow_csv_export: true,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
      {
        table_name: 'courses',
        display_name: null,
        search_fields: [],
        excluded_fields: [],
        list_fields: ['title', 'description', 'language', 'level', 'price', 'is_published', 'created_at', 'id'],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: '',
        readonly_fields: [],
        sortable_by: [],
        autocomplete_columns: [],
        identification_fields: [],
        columns_view: [],
        identity_column: 'title',
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: [],
        icon: 'book_ribbon',
        allow_csv_export: true,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
      {
        table_name: 'enrollments',
        display_name: '',
        search_fields: [],
        excluded_fields: [],
        list_fields: ['user_id', 'course_id', 'progress', 'completed', 'enrolled_at', 'id'],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: '',
        readonly_fields: [],
        sortable_by: [],
        autocomplete_columns: [],
        identification_fields: [],
        columns_view: [],
        identity_column: 'user_id',
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: [],
        icon: 'how_to_reg',
        allow_csv_export: true,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
      {
        table_name: 'lessons',
        display_name: null,
        search_fields: [],
        excluded_fields: [],
        list_fields: ['title', 'module_id', 'content', 'video_url', 'duration', 'position', 'content_url', 'id'],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: null,
        readonly_fields: [],
        sortable_by: [],
        autocomplete_columns: [],
        identification_fields: [],
        columns_view: null,
        identity_column: 'title',
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: null,
        icon: 'local_library',
        allow_csv_export: true,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
      {
        table_name: 'quiz_attempts',
        display_name: null,
        search_fields: [],
        excluded_fields: [],
        list_fields: ['user_id', 'quiz_id', 'score', 'started_at', 'completed_at', 'id'],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: null,
        readonly_fields: ['completed_at'],
        sortable_by: [],
        autocomplete_columns: [],
        identification_fields: [],
        columns_view: null,
        identity_column: 'user_id',
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: null,
        icon: 'add_task',
        allow_csv_export: true,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
      {
        table_name: 'quizzes',
        display_name: null,
        search_fields: ['lesson_id', 'title'],
        excluded_fields: [],
        list_fields: ['title', 'lesson_id', 'max_score', 'questions', 'id'],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: null,
        readonly_fields: [],
        sortable_by: [],
        autocomplete_columns: ['title'],
        identification_fields: [],
        columns_view: null,
        identity_column: 'title',
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: null,
        icon: 'edit_document',
        allow_csv_export: false,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
      {
        table_name: 'users',
        display_name: '',
        search_fields: ['role', 'full_name', 'email', 'bio'],
        excluded_fields: [],
        list_fields: [
          'full_name',
          'role',
          'email',
          'bio',
          'date_of_birth',
          'created_at',
          'last_login',
          'password_hash',
          'id',
        ],
        list_per_page: null,
        ordering: QueryOrderingEnum.ASC,
        ordering_field: '',
        readonly_fields: [],
        sortable_by: [],
        autocomplete_columns: ['role', 'full_name', 'email', 'bio'],
        identification_fields: [],
        columns_view: ['role', 'full_name', 'email', 'date_of_birth'],
        identity_column: 'full_name',
        can_delete: true,
        can_update: true,
        can_add: true,
        sensitive_fields: ['email', 'date_of_birth'],
        icon: 'groups_3',
        allow_csv_export: true,
        allow_csv_import: true,
        connection_id: connection.id,
        masterPwd: null,
        userId: connection?.author?.id || null,
      },
    ];

    const tableSettingEntities = tableSettingsDtos.map((dto) => {
      return buildNewTableSettingsEntity(dto, connection);
    });
    const savedTableSettings = await this._dbContext.tableSettingsRepository.save(tableSettingEntities);
    await this.createDemoPostgresTablesWidgets(savedTableSettings);
    return savedTableSettings;
  }

  private async createDemoPostgresTablesWidgets(tableSettings: Array<TableSettingsEntity>): Promise<void> {
    const foundCertificatesTableSettings = tableSettings.find((settings) => settings.table_name === 'certificates');
    if (foundCertificatesTableSettings) {
      const createCertificatesWidgetsData: Array<CreateTableWidgetDs> = [
        {
          field_name: 'user_id',
          widget_type: '' as any,
          name: 'User',
          description: '',
          widget_params: null,
          widget_options: null,
        },
        {
          field_name: 'certificate_url',
          widget_type: 'URL' as any,
          name: '',
          description: '',
          widget_params:
            '// prefix: optional URL prefix to prepend to the href\n// example:\n{\n  "prefix": "https://certificates.example.com/"\n}\n',
          widget_options: null,
        },
        {
          field_name: 'course_id',
          widget_type: '' as any,
          name: 'Course',
          description: "hi i'm a description",
          widget_params: null,
          widget_options: null,
        },
      ];
      const newWidgets = createCertificatesWidgetsData.map((widget) => {
        const newWidget = buildNewTableWidgetEntity(widget);
        newWidget.settings = foundCertificatesTableSettings;
        return newWidget;
      });
      await this._dbContext.tableWidgetsRepository.save(newWidgets);
    }
    const foundCourseMentorsTableSettings = tableSettings.find((settings) => settings.table_name === 'course_mentors');
    if (foundCourseMentorsTableSettings) {
      const createCourseMentorsWidgetsData: Array<CreateTableWidgetDs> = [
        {
          field_name: 'course_id',
          widget_type: '' as any,
          name: 'Course',
          description: '',
          widget_params: '',
          widget_options: null,
        },
        {
          field_name: 'user_id',
          widget_type: '' as any,
          name: 'User',
          description: '',
          widget_params: null,
          widget_options: null,
        },
      ];
      const newWidgets = createCourseMentorsWidgetsData.map((widget) => {
        const newWidget = buildNewTableWidgetEntity(widget);
        newWidget.settings = foundCourseMentorsTableSettings;
        return newWidget;
      });
      await this._dbContext.tableWidgetsRepository.save(newWidgets);
    }

    const foundCourseModulesTableSettings = tableSettings.find((settings) => settings.table_name === 'course_modules');
    if (foundCourseModulesTableSettings) {
      const createCourseModulesWidgetsData: Array<CreateTableWidgetDs> = [
        {
          field_name: 'course_id',
          widget_type: '' as any,
          name: 'Course',
          description: '',
          widget_params: '',
          widget_options: null,
        },
      ];
      const newWidgets = createCourseModulesWidgetsData.map((widget) => {
        const newWidget = buildNewTableWidgetEntity(widget);
        newWidget.settings = foundCourseModulesTableSettings;
        return newWidget;
      });
      await this._dbContext.tableWidgetsRepository.save(newWidgets);
    }

    const foundCoursesTableSettings = tableSettings.find((settings) => settings.table_name === 'courses');
    if (foundCoursesTableSettings) {
      const createCoursesWidgetsData: Array<CreateTableWidgetDs> = [
        {
          field_name: 'price',
          widget_type: 'Money' as any,
          name: '',
          description: '',
          widget_params:
            '// Configure money widget settings\n// example:\n{\n  "default_currency": "USD",\n  "show_currency_selector": false,\n  "decimal_places": 2,\n  "allow_negative": false\n}\n',
          widget_options: null,
        },
      ];
      const newWidgets = createCoursesWidgetsData.map((widget) => {
        const newWidget = buildNewTableWidgetEntity(widget);
        newWidget.settings = foundCoursesTableSettings;
        return newWidget;
      });
      await this._dbContext.tableWidgetsRepository.save(newWidgets);
    }

    const foundEnrollmentsTableSettings = tableSettings.find((settings) => settings.table_name === 'enrollments');
    if (foundEnrollmentsTableSettings) {
      const createEnrollmentsWidgetsData: Array<CreateTableWidgetDs> = [
        {
          field_name: 'user_id',
          widget_type: '' as any,
          name: 'User',
          description: '',
          widget_params: null,
          widget_options: null,
        },
        {
          field_name: 'course_id',
          widget_type: '' as any,
          name: 'Course',
          description: '',
          widget_params: null,
          widget_options: null,
        },
        {
          field_name: 'progress',
          widget_type: 'Range' as any,
          name: '',
          description: '',
          widget_params:
            '// Configure the minimum, maximum and step values for the range\n// Default: min = 0, max = 100, step = 1\n{\n  "min": 0,\n  "max": 100,\n  "step": 0.01\n}\n',
          widget_options: null,
        },
      ];
      const newWidgets = createEnrollmentsWidgetsData.map((widget) => {
        const newWidget = buildNewTableWidgetEntity(widget);
        newWidget.settings = foundEnrollmentsTableSettings;
        return newWidget;
      });
      await this._dbContext.tableWidgetsRepository.save(newWidgets);
    }

    const foundLessonsTableSettings = tableSettings.find((settings) => settings.table_name === 'lessons');
    if (foundLessonsTableSettings) {
      const createLessonsWidgetsData: Array<CreateTableWidgetDs> = [
        {
          field_name: 'video_url',
          widget_type: 'URL' as any,
          name: '',
          description: '',
          widget_params:
            '// prefix: optional URL prefix to prepend to the href\n// example:\n{\n  "prefix": "https://videos.example.com/"\n}\n',
          widget_options: null,
        },
        {
          field_name: 'module_id',
          widget_type: '' as any,
          name: 'Module',
          description: '',
          widget_params: null,
          widget_options: null,
        },
        {
          field_name: 'content_url',
          widget_type: 'URL' as any,
          name: '',
          description: '',
          widget_params:
            '// prefix: optional URL prefix to prepend to the href\n// example:\n{\n  "prefix": "https://content.example.com/"\n}\n',
          widget_options: null,
        },
      ];
      const newWidgets = createLessonsWidgetsData.map((widget) => {
        const newWidget = buildNewTableWidgetEntity(widget);
        newWidget.settings = foundLessonsTableSettings;
        return newWidget;
      });
      await this._dbContext.tableWidgetsRepository.save(newWidgets);
    }

    const foundQuizAttemptsTableSettings = tableSettings.find((settings) => settings.table_name === 'quiz_attempts');
    if (foundQuizAttemptsTableSettings) {
      const createQuizAttemptsWidgetsData: Array<CreateTableWidgetDs> = [
        {
          field_name: 'quiz_id',
          widget_type: '' as any,
          name: 'Quiz',
          description: '',
          widget_params: '',
          widget_options: null,
        },
        {
          field_name: 'user_id',
          widget_type: '' as any,
          name: 'User',
          description: '',
          widget_params: null,
          widget_options: null,
        },
      ];
      const newWidgets = createQuizAttemptsWidgetsData.map((widget) => {
        const newWidget = buildNewTableWidgetEntity(widget);
        newWidget.settings = foundQuizAttemptsTableSettings;
        return newWidget;
      });
      await this._dbContext.tableWidgetsRepository.save(newWidgets);
    }

    const foundQuizzesTableSettings = tableSettings.find((settings) => settings.table_name === 'quizzes');
    if (foundQuizzesTableSettings) {
      const createQuizzesWidgetsData: Array<CreateTableWidgetDs> = [
        {
          field_name: 'lesson_id',
          widget_type: '' as any,
          name: 'Lesson',
          description: '',
          widget_params: '',
          widget_options: null,
        },
      ];
      const newWidgets = createQuizzesWidgetsData.map((widget) => {
        const newWidget = buildNewTableWidgetEntity(widget);
        newWidget.settings = foundQuizzesTableSettings;
        return newWidget;
      });
      await this._dbContext.tableWidgetsRepository.save(newWidgets);
    }

    const foundUsersTableSettings = tableSettings.find((settings) => settings.table_name === 'users');
    if (foundUsersTableSettings) {
      const createUsersWidgetsData: Array<CreateTableWidgetDs> = [
        {
          field_name: 'role',
          widget_type: 'Select' as any,
          name: '',
          description: '',
          widget_params:
            '{\n  "allow_null": false,\n  "options": [\n    {\n      "value": "admin",\n      "label": "🥷 Admin"\n    },\n    {\n      "value": "mentor",\n      "label": "🧑‍🏫 Mentor"\n    },\n    {\n      "value": "student",\n      "label": "🧑‍🎓 Student"\n    }\n  ]\n}',
          widget_options: null,
        },
        {
          field_name: 'password_hash',
          widget_type: 'Password' as any,
          name: 'Password',
          description: '',
          widget_params:
            '// provide algorithm to encrypt your password, one of:\n//sha1, sha3, sha224, sha256, sha512, sha384, bcrypt, scrypt, argon2, pbkdf2.\n// example:\n\n{\n  "algorithm": "sha224"\n}\n\n',
          widget_options: null,
        },
      ];
      const newWidgets = createUsersWidgetsData.map((widget) => {
        const newWidget = buildNewTableWidgetEntity(widget);
        newWidget.settings = foundUsersTableSettings;
        return newWidget;
      });
      await this._dbContext.tableWidgetsRepository.save(newWidgets);
    }
  }

  private async createDemoPostgresSavedTableFilters(connection: ConnectionEntity): Promise<void> {
    const savedFiltersData: Array<CreateTableFilterDs> = [
      {
        filters: { completed: { eq: true } },
        table_name: 'enrollments',
        connection_id: connection.id,
        filter_name: 'Completed courses',
        dynamic_filtered_column: { column_name: 'course_id', comparator: FilterCriteriaEnum.eq },
        masterPwd: null,
      },
      {
        filters: { price: { gt: 100 }, is_published: { eq: true } },
        table_name: 'courses',
        connection_id: connection.id,
        filter_name: 'Expensive published',
        dynamic_filtered_column: { column_name: 'title', comparator: FilterCriteriaEnum.contains },
        masterPwd: null,
      },
      {
        filters: { language: { eq: 'en' }, is_published: { eq: true } },
        table_name: 'courses',
        connection_id: connection.id,
        filter_name: 'Published in English',
        dynamic_filtered_column: { column_name: 'title', comparator: FilterCriteriaEnum.contains },
        masterPwd: null,
      },
      {
        filters: { role: { eq: 'student' } },
        table_name: 'users',
        connection_id: connection.id,
        filter_name: 'Students',
        dynamic_filtered_column: { column_name: 'full_name', comparator: FilterCriteriaEnum.contains },
        masterPwd: null,
      },
      {
        filters: { role: { eq: 'mentor' } },
        table_name: 'users',
        connection_id: connection.id,
        filter_name: 'Mentors',
        dynamic_filtered_column: { column_name: 'email', comparator: FilterCriteriaEnum.contains },
        masterPwd: null,
      },
    ];
    const tableFilterEntities = savedFiltersData.map((dto) => {
      return buildNewTableFiltersEntity(dto);
    });
    await this._dbContext.tableFiltersRepository.save(tableFilterEntities);
  }
}
