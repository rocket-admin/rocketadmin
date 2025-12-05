import { faker } from '@faker-js/faker';
import jwt from 'jsonwebtoken';
import { IRequestWithCognitoInfo } from '../src/authorization/index.js';
import { CreateConnectionPropertiesDto } from '../src/entities/connection-properties/dto/index.js';
import { TableActionEntity } from '../src/entities/table-actions/table-actions-module/table-action.entity.js';
import { CreateTableWidgetDto } from '../src/entities/widget/dto/index.js';
import { AccessLevelEnum, PermissionTypeEnum, QueryOrderingEnum, WidgetTypeEnum } from '../src/enums/index.js';
import { TestConstants } from './mocks/test-constants.js';
import json5 from 'json5';
import { ConnectionTypeTestEnum } from '../src/enums/connection-type.enum.js';
import { CreateConnectionDto } from '../src/entities/connection/application/dto/create-connection.dto.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { CreateTableActionDTO } from '../src/entities/table-actions/table-actions-module/dto/create-table-action.dto.js';

class CreateGroupDto {
  title: string;
  permissions?: Array<any>;
  isMain?: boolean;
  users?: Array<any>;
}
import { CreatePersonalTableSettingsDto } from '../src/entities/table-settings/personal-table-settings/dto/create-personal-table-settings.dto.js';
export class MockFactory {
  generateCognitoUserName() {
    return 'a876284a-e902-11ea-adc1-0242ac120002';
  }

  generateCreateConnectionDtoToTEstDB() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Connection to Test DB';
    dto.type = 'postgres';
    dto.host = 'postgres';
    dto.port = 5432;
    dto.username = 'postgres';
    dto.password = 'abc123';
    dto.database = 'postgres';
    dto.ssh = false;
    return dto;
  }

  generateCreateConnectionDto() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test Connection';
    dto.type = 'postgres';
    dto.host = 'nestjs_testing';
    dto.port = 5432;
    dto.username = 'postgres';
    dto.password = 'postgres';
    dto.database = 'nestjs_testing';
    dto.ssh = false;
    return dto;
  }

  generateCreateEncryptedConnectionDto() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test Connection';
    dto.type = 'postgres';
    dto.host = 'nestjs_testing';
    dto.port = 5432;
    dto.username = 'postgres';
    dto.password = 'postgres';
    dto.database = 'nestjs_testing';
    dto.ssh = false;
    dto.masterEncryption = true;
    return dto;
  }

  generateCreateInternalConnectionDto() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test Internal Connection';
    dto.type = 'postgres';
    dto.host = 'postgres';
    dto.port = 5432;
    dto.username = 'postgres';
    dto.password = 'abc123';
    dto.database = 'template1';
    dto.ssh = false;
    return dto;
  }

  generateCreateEncryptedInternalConnectionDto() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test Internal Connection';
    dto.type = 'postgres';
    dto.host = 'postgres';
    dto.port = 5432;
    dto.username = 'postgres';
    dto.password = 'abc123';
    dto.database = 'postgres';
    dto.ssh = false;
    dto.masterEncryption = true;
    return dto;
  }

  generateCreateConnectionDto2() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test Connection 2';
    dto.type = 'mysql';
    dto.host = 'testMySQL-e2e-testing';
    dto.port = 3306;
    dto.username = 'root';
    dto.password = 'admin123';
    dto.database = 'testDB';
    dto.ssh = false;
    return dto;
  }

  generateConnectionToTestClickHouseDBInDocker() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to ClickHouse in Docker';
    dto.type = 'clickhouse';
    dto.host = 'clickhouse-e2e-testing';
    dto.port = 8123;
    dto.username = 'default';
    dto.password = 'clickhouse_password';
    dto.database = 'testdb';
    dto.ssh = false;
    return dto;
  }

  generateConnectionToTestClickHouseAgent() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to agent db';
    dto.type = ConnectionTypesEnum.agent_clickhouse;
    return dto;
  }

  generateConnectionToTestMySQLDBInDocker() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to MySQL in Docker';
    dto.type = 'mysql';
    dto.host = 'testMySQL-e2e-testing';
    dto.port = 3306;
    dto.username = 'root';
    dto.password = '123';
    dto.database = 'testDB';
    dto.ssh = false;
    return dto;
  }

  generateConnectionToTestPostgresDBInDocker() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to Postgres in Docker';
    dto.type = 'postgres';
    dto.host = 'testPg-e2e-testing';
    dto.port = 5432;
    dto.username = 'postgres';
    dto.password = '123';
    dto.database = 'postgres';
    dto.ssh = false;
    return dto;
  }

  generateConnectionToTestMongoDBInDocker() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to MongoDB in Docker';
    dto.type = 'mongodb';
    dto.host = 'test-mongo-e2e-testing';
    dto.port = 27017;
    dto.database = 'admin';
    dto.username = 'root';
    dto.password = 'example';
    dto.ssh = false;
    return dto;
  }

  generateConnectionToTestMongoDBAgent() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to agent db';
    dto.type = ConnectionTypesEnum.agent_mongodb;
    return dto;
  }

  generateConnectionToTestDynamoDBInDocker() {
    const dto = new CreateConnectionDto();
    dto.title = 'Test connection to DynamoDB in Docker';
    dto.type = ConnectionTypesEnum.dynamodb;
    dto.host = 'http://test-dynamodb-e2e-testing:8000';
    dto.username = 'SuperSecretAwsAccessKey';
    dto.password = 'SuperSecretAwsSecret';
    return dto;
  }

  generateEncryptedConnectionToTestPostgresDBInDocker() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to Postgres in Docker';
    dto.type = 'postgres';
    dto.host = 'testPg-e2e-testing';
    dto.port = 5432;
    dto.username = 'postgres';
    dto.password = '123';
    dto.database = 'postgres';
    dto.masterEncryption = true;
    dto.ssh = false;
    return dto;
  }

  generateConnectionToTestPostgresDBWithSchemaInDocker() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to Postgres in Docker';
    dto.type = 'postgres';
    dto.host = 'testPg-e2e-testing';
    dto.port = 5432;
    dto.username = 'postgres';
    dto.password = '123';
    dto.database = 'postgres';
    dto.schema = 'test_schema';
    dto.ssh = false;
    return dto;
  }

  generateConnectionToTestMsSQlDBInDocker() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to MSSQL in Docker';
    dto.type = 'mssql';
    dto.host = 'mssql-e2e-testing';
    dto.port = 1433;
    dto.username = 'sa';
    dto.password = 'yNuXf@6T#BgoQ%U6knMp';
    dto.database = 'TempDB';
    dto.ssh = false;
    return dto;
  }

  generateConnectionToTestSchemaMsSQlDBInDocker() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to MSSQL in Docker';
    dto.type = 'mssql';
    dto.host = 'mssql-e2e-testing';
    dto.port = 1433;
    dto.username = 'sa';
    dto.password = 'yNuXf@6T#BgoQ%U6knMp';
    dto.database = 'TempDB';
    dto.schema = 'test_schema';
    dto.ssh = false;
    return dto;
  }

  generateConnectionToTestOracleDBInDocker() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to Oracle on localhost';
    dto.type = 'oracledb';
    dto.host = 'test-oracle-e2e-testing';
    dto.port = 1521;
    dto.username = 'SYSTEM';
    dto.sid = 'XE';
    dto.password = '12345';
    dto.database = 'XEPDB1';
    dto.ssh = false;
    return dto;
  }

  generateConnectionToSchemaOracleDBInDocker() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to Oracle on localhost';
    dto.type = 'oracledb';
    dto.host = 'test-oracle-e2e-testing';
    dto.port = 1521;
    dto.username = 'SYSTEM';
    dto.sid = 'XE';
    dto.password = '12345';
    dto.database = 'XEPDB1';
    dto.schema = 'SYSTEM';
    dto.ssh = false;
    return dto;
  }

  generateConnectionToTestDbIbmDb2() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to cli db ibm db2';
    dto.type = ConnectionTypesEnum.ibmdb2;
    dto.host = 'test-ibm-db2-e2e-testing';
    dto.port = 50000;
    dto.username = 'db2inst1';
    dto.password = 'password';
    dto.database = 'testdb';
    dto.schema = 'SCHEMA_NAME';
    dto.ssh = false;
    return dto;
  }

  generateConnectionToTestElasticsearchInDocker() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to Elasticsearch in Docker';
    dto.type = 'elasticsearch';
    dto.host = 'test-elasticsearch-e2e-testing';
    dto.password = 'SuperSecretElasticPassword';
    dto.port = 9200;
    dto.username = 'elastic';
    dto.ssh = false;
    return dto;
  }

  generateConnectionToTestCassandraInDocker() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to Cassandra in Docker';
    dto.type = 'cassandra';
    dto.host = 'test-cassandra-e2e-testing';
    dto.port = 9042;
    dto.username = 'cassandra';
    dto.password = 'cassandra';
    dto.database = 'testdb';
    dto.dataCenter = 'datacenter1';
    dto.ssh = false;
    return dto;
  }

  generateConnectionToTestCassandraAgent() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to agent db';
    dto.type = ConnectionTypesEnum.agent_cassandra;
    return dto;
  }

  generateConnectionToTestRedisInDocker() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to Redis in Docker';
    dto.type = ConnectionTypesEnum.redis;
    dto.host = 'test-redis-e2e-testing';
    dto.port = 6379;
    dto.password = 'SuperSecretRedisPassword';
    dto.ssh = false;
    return dto;
  }

  generateConnectionToTestRedisAgent() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to redis agent db';
    dto.type = ConnectionTypesEnum.agent_redis;
    return dto;
  }

  generateKnexConfigAgentTests(db_type = 'postgres') {
    switch (db_type) {
      case 'postgres':
        return this.generateConnectionToTestPostgresDBInDocker();
      case 'oracledb':
        return this.generateConnectionToSchemaOracleDBInDocker();
      case 'mssql':
        return this.generateConnectionToTestMsSQlDBInDocker();
      case 'mysql':
        const config = this.generateConnectionToTestMySQLDBInDocker();
        config.type = 'mysql2';
        return config;
    }
  }

  generateConnectionToTestDbPostgresAgent() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to agent db';
    dto.type = ConnectionTypesEnum.agent_postgres;
    return dto;
  }

  generateConnectionToTestDbOracleAgent() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to agent db';
    dto.type = ConnectionTypesEnum.agent_oracledb;
    return dto;
  }

  generateConnectionToTestDbMysqlAgent() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to agent db';
    dto.type = ConnectionTypesEnum.agent_mysql;
    return dto;
  }

  generateConnectionToTestDbMssqlAgent() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to agent db';
    dto.type = ConnectionTypesEnum.agent_mssql;
    return dto;
  }

  generateConnectionToTestDbIbmDb2Agent() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Test connection to agent db';
    dto.type = ConnectionTypesEnum.agent_ibmdb2;
    return dto;
  }

  generateUpdateConnectionDto() {
    const dto = new CreateConnectionDto() as any;
    dto.title = 'Updated Test Connection';
    dto.type = 'postgres';
    dto.host = 'testing_nestjs';
    dto.port = 5432;
    dto.username = 'admin';
    dto.password = 'abc123';
    dto.database = 'testing_nestjs';
    dto.ssh = false;
    return dto;
  }

  generateCreateGroupDto1() {
    const dto = new CreateGroupDto();
    dto.title = `${faker.lorem.words(1)}_${faker.lorem.words(1)}`;

    return dto;
  }

  generateUserPermissionsArray(groupId) {
    const permissionsArr = [
      {
        type: 'Table',
        accessLevel: 'visibility',
        tableName: 'user',
        groupId: groupId,
      },
      {
        type: 'Table',
        accessLevel: 'add',
        tableName: 'user',
        groupId: groupId,
      },
      {
        type: 'Table',
        accessLevel: 'edit',
        tableName: 'user',
        groupId: groupId,
      },
    ];

    return permissionsArr;
  }

  generateCreatePermissionDTOgroup(groupId) {
    return {
      type: PermissionTypeEnum.Group,
      accessLevel: AccessLevelEnum.edit,
      tableName: '',
      groupId: groupId,
    };
  }

  generateCreatePermissionDTOconnection(groupId) {
    return {
      type: PermissionTypeEnum.Connection,
      accessLevel: AccessLevelEnum.edit,
      tableName: '',
      groupId: groupId,
    };
  }

  generateCreatePermissionDTOtable(groupId: string, tableName: string) {
    return {
      type: PermissionTypeEnum.Table,
      accessLevel: AccessLevelEnum.edit,
      tableName: tableName,
      groupId: groupId,
    };
  }

  generatePermissions(
    connectionId: string,
    groupId: string,
    firstTableName: string,
    secondTableName: string,
    connectionAccessLevel: string,
    groupAccessLevel: string,
  ) {
    return {
      permissions: {
        connection: {
          connectionId: connectionId,
          accessLevel: connectionAccessLevel,
        },
        group: {
          groupId: connectionId,
          accessLevel: groupAccessLevel,
        },
        tables: [
          {
            tableName: firstTableName,
            accessLevel: {
              visibility: true,
              readonly: false,
              add: true,
              delete: false,
              edit: true,
            },
          },
          {
            tableName: secondTableName,
            accessLevel: {
              visibility: false,
              readonly: true,
              add: false,
              delete: false,
              edit: false,
            },
          },
        ],
      },
    };
  }

  generateInternalPermissions(
    connectionId: string,
    groupId: string,
    connectionAccessLevel: string,
    groupAccessLevel: string,
  ) {
    const bool = () => {
      return Math.random() < 0.5;
    };
    const tableNames = [
      'table_widget',
      'table',
      'mock',
      'group',
      'tableSettings',
      'tableLogs',
      'permission',
      'permission_groups_group',
      'user_groups_group',
      'user',
      'connection',
      'group_permissions_permission',
      'group_users_user',
      'customFields',
      'agent',
    ];
    const tableObjects = [];
    for (const name of tableNames) {
      tableObjects.push({
        tableName: name,
        accessLevel: {
          visibility: bool(),
          readonly: bool(),
          add: bool(),
          delete: bool(),
          edit: bool(),
        },
      });
    }
    return {
      permissions: {
        connection: {
          connectionId: connectionId,
          accessLevel: connectionAccessLevel,
        },
        group: {
          groupId: connectionId,
          accessLevel: groupAccessLevel,
        },
        tables: tableObjects,
      },
    };
  }

  //   {
  //   id: 'e82ed355-94fd-46e5-b732-c0e8f01ccc96',
  //   table_name: 'capitulus_xiphias_rU6K_delectatio',
  //   display_name: 'test display name',
  //   search_fields: [ 'voluptas_adulatio' ],
  //   excluded_fields: [],
  //   identification_fields: [],
  //   identity_column: null,
  //   readonly_fields: [],
  //   sensitive_fields: null,
  //   sortable_by: [],
  //   autocomplete_columns: [],
  //   columns_view: null,
  //   connection_id: 'k7N6nja2',
  //   can_add: true,
  //   can_delete: true,
  //   can_update: true,
  //   icon: null,
  //   allow_csv_export: true,
  //   allow_csv_import: true
  // }

  generateTableSettings(
    connectionId: string,
    tableName: string,
    searchedFields: Array<string>,
    excludedFields: Array<string>,
    // listFields: Array<string>,
    // listPerPage = 3,
    // ordering: QueryOrderingEnum,
    // orderingField: string,
    readonlyFields: Array<string>,
    sortableBy: Array<string>,
    autocompleteColumns: Array<string>,
    identification_fields: Array<string>,
    identity_column: string,
    allow_csv_import = true,
    allow_csv_export = true,
  ) {
    /*eslint-disable*/
    return {
      connection_id: connectionId,
      table_name: tableName,
      display_name: 'test display name',
      search_fields: searchedFields,
      excluded_fields: excludedFields,
      readonly_fields: readonlyFields,
      sortable_by: sortableBy,
      autocomplete_columns: autocompleteColumns,
      identification_fields: identification_fields,
      identity_column: identity_column,
      allow_csv_import: allow_csv_import,
      allow_csv_export: allow_csv_export,
    };
    /*eslint-enable*/
  }

  generatePersonalTableSettingsDto(
    list_fields: Array<string>,
    list_per_page = 3,
    ordering: QueryOrderingEnum,
    ordering_field: string,
    columns_view? : Array<string>,
    original_names: boolean = true,
  ): CreatePersonalTableSettingsDto {
    return {
      columns_view,
      list_fields,
      list_per_page,
      ordering,
      ordering_field,
      original_names,
    };
  }

  generateTableSettingsWithoutTypes(
    connectionId: any,
    tableName: any,
    searchedFields: any,
    excludedFields: any,
    // listFields: any,
    // listPerPage: any,
    // ordering: any,
    // orderingField: any,
    readonlyFields: any,
    sortebleBy: any,
    autocompleteColumns: any,
  ) {
    /*eslint-disable*/
    return {
      connection_id: connectionId,
      table_name: tableName,
      display_name: 'test display name',
      search_fields: searchedFields,
      excluded_fields: excludedFields,
      readonly_fields: readonlyFields,
      sortable_by: sortebleBy,
      autocomplete_columns: autocompleteColumns,
    };
    /*eslint-enable*/
  }

  static getMockRequest(): IRequestWithCognitoInfo {
    return {
      arrayBuffer(): Promise<ArrayBuffer> {
        return Promise.resolve(undefined);
      },
      blob(): Promise<Blob> {
        return Promise.resolve(undefined);
      },
      body: undefined,
      bodyUsed: false,
      cache: undefined,
      clone(): Request {
        return undefined;
      },
      credentials: undefined,
      destination: undefined,
      formData(): Promise<FormData> {
        return Promise.resolve(undefined);
      },

      headers: {} as any,
      integrity: '',
      isHistoryNavigation: false,
      isReloadNavigation: false,
      json(): Promise<any> {
        return Promise.resolve(undefined);
      },
      keepalive: false,
      method: '',
      mode: undefined,
      redirect: undefined,
      referrer: '',
      referrerPolicy: undefined,
      signal: undefined,
      text(): Promise<string> {
        return Promise.resolve('');
      },
      url: '',
      decoded: {
        /* eslint-disable */
        at_hash: undefined,
        sub: '87cdc6c3-ed8d-4b7c-890f-3ccc16b22c7f',
        aud: undefined,
        email_verified: undefined,
        event_id: undefined,
        token_use: undefined,
        auth_time: undefined,
        iss: undefined,
        'cognito:username': '87cdc6c3-ed8d-4b7c-890f-3ccc16b22c7f',
        exp: undefined,
        iat: undefined,
        email: undefined,
        /* eslint-enable */
      },
    } as any;
  }

  generateCustomFieldForConnectionTable(fieldNameId: string, fieldNameTitle: string) {
    return {
      type: 'AA:Link',
      template_string: `https//?connectionId={{${fieldNameId}}}&connectionTitle={{${fieldNameTitle}}}`,
      text: 'Go To',
    };
  }

  generateCustomFieldForUsersTable(fieldNameId: string, fieldNameTitle: string) {
    return {
      type: 'AA:Link',
      template_string: `https//?id={{${fieldNameId}}}&email={{${fieldNameTitle}}}`,
      text: 'Go To',
    };
  }

  generateCreateWidgetDTOForConnectionTable() {
    const newWidgetDTO = new CreateTableWidgetDto();
    /* eslint-disable */
    newWidgetDTO.field_name = 'id';
    newWidgetDTO.widget_type = WidgetTypeEnum.Password;
    newWidgetDTO.widget_params = JSON.stringify({ a: '*', b: '+', c: '#', encrypt: false });
    newWidgetDTO.name = 'new widget';
    newWidgetDTO.description = 'test widget';
    /* eslint-enable */
    return newWidgetDTO;
  }

  generateCreateWidgetDTOsArrayForConnectionTable() {
    const widgets = [];
    const newWidgetDTO = new CreateTableWidgetDto();
    /* eslint-disable */
    newWidgetDTO.field_name = 'database';
    newWidgetDTO.widget_type = WidgetTypeEnum.Password;
    newWidgetDTO.widget_params = json5.stringify({ a: '*', b: '+', c: '#', encrypt: false });
    newWidgetDTO.name = 'new widget';
    newWidgetDTO.description = 'test widget';
    const newWidgetDTO2 = new CreateTableWidgetDto();
    newWidgetDTO2.field_name = 'id';
    newWidgetDTO2.widget_type = WidgetTypeEnum.Password;
    newWidgetDTO2.widget_params = json5.stringify({ a: '&', b: '!!', c: '||', encrypt: false });
    newWidgetDTO2.name = 'new widget';
    newWidgetDTO2.description = 'test 2 widget';
    /* eslint-enable */

    widgets.push(newWidgetDTO, newWidgetDTO2);
    return widgets;
  }

  generateCreateWidgetDTOsArrayForUsersTable(firstFieldName = 'id', secondFieldName = 'email') {
    const widgets = [];
    const newWidgetDTO = new CreateTableWidgetDto();
    /* eslint-disable */
    newWidgetDTO.field_name = secondFieldName;
    newWidgetDTO.widget_type = WidgetTypeEnum.Password;
    newWidgetDTO.widget_params = JSON.stringify({ a: '*', b: '+', c: '#', encrypt: false });
    newWidgetDTO.name = 'new widget';
    newWidgetDTO.description = 'test widget';
    const newWidgetDTO2 = new CreateTableWidgetDto();
    newWidgetDTO2.field_name = firstFieldName;
    newWidgetDTO2.widget_type = WidgetTypeEnum.Password;
    newWidgetDTO2.widget_params = JSON.stringify({ a: '&', b: '!!', c: '||', encrypt: false });
    newWidgetDTO2.name = 'new widget';
    newWidgetDTO2.description = 'test 2 widget';
    /* eslint-enable */

    widgets.push(newWidgetDTO, newWidgetDTO2);
    return widgets;
  }

  generateUpdateWidgetDTOsArrayForConnectionTable() {
    const widgets = [];
    const newWidgetDTO = new CreateTableWidgetDto();
    /* eslint-disable */
    newWidgetDTO.field_name = 'database';
    newWidgetDTO.widget_type = WidgetTypeEnum.Password;
    newWidgetDTO.widget_params = json5.stringify({ a: '&', b: '+', c: '#', encrypt: false });
    newWidgetDTO.name = 'new updated widget';
    newWidgetDTO.description = 'updated test widget';
    const newWidgetDTO2 = new CreateTableWidgetDto();
    newWidgetDTO2.field_name = 'id';
    newWidgetDTO2.widget_type = WidgetTypeEnum.Password;
    newWidgetDTO2.widget_params = json5.stringify({ a: '-', b: '!!', c: '||', encrypt: false });
    newWidgetDTO2.name = 'new updated widget';
    newWidgetDTO2.description = 'updated test 2 widget';
    /* eslint-enable */

    widgets.push(newWidgetDTO, newWidgetDTO2);
    return widgets;
  }

  generateUpdateWidgetDTOsArrayForUsersTable() {
    const widgets = [];
    const newWidgetDTO = new CreateTableWidgetDto();
    /* eslint-disable */
    newWidgetDTO.field_name = 'email';
    newWidgetDTO.widget_type = WidgetTypeEnum.Password;
    newWidgetDTO.widget_params = JSON.stringify({ a: '&', b: '+', c: '#', encrypt: false });
    newWidgetDTO.name = 'new updated widget';
    newWidgetDTO.description = 'updated test widget';
    const newWidgetDTO2 = new CreateTableWidgetDto();
    newWidgetDTO2.field_name = 'id';
    newWidgetDTO2.widget_type = WidgetTypeEnum.Password;
    newWidgetDTO2.widget_params = JSON.stringify({ a: '-', b: '!!', c: '||', encrypt: false });
    newWidgetDTO2.name = 'new updated widget';
    newWidgetDTO2.description = 'updated test 2 widget';
    /* eslint-enable */

    widgets.push(newWidgetDTO, newWidgetDTO2);
    return widgets;
  }

  public static getDecodedInfo(req: any) {
    const authHeaders = req.headers.authorization;
    const token = (authHeaders as string)?.split(' ')[1];
    if (!token) {
      const decoded = {
        sub: 'a876284a-e902-11ea-adc1-0242ac120002',
      };
      req.decoded = decoded;
      return req;
    }
    const secret = 'ahalai-mahalai';
    const decoded = jwt.verify(token, secret);
    req.decoded = decoded;
    return req;
  }

  public static generateFirstTestUserToken(
    name = TestConstants.FIRST_TEST_USER.name,
    sub = TestConstants.FIRST_TEST_USER.sub,
    email = TestConstants.FIRST_TEST_USER.email,
  ) {
    return MockFactory.generateJWT({ sub, name, email });
  }

  public static generateSecondTestUserToken(
    name = TestConstants.SECOND_TEST_USER.name,
    sub = TestConstants.SECOND_TEST_USER.sub,
    email = TestConstants.SECOND_TEST_USER.email,
  ) {
    return MockFactory.generateJWT({ sub, name, email });
  }

  public static generateThirdUserToken(
    name = TestConstants.THIRD_TEST_USER.name,
    sub = TestConstants.THIRD_TEST_USER.sub,
    email = TestConstants.THIRD_TEST_USER.email,
  ) {
    return MockFactory.generateJWT({ sub, name, email });
  }

  private static generateJWT(user) {
    const today = new Date();
    const exp = new Date(today);
    exp.setDate(today.getDate() + 60);
    const secret = 'ahalai-mahalai';
    return jwt.sign(
      {
        sub: user.sub,
        username: user.username,
        email: user.email,
        exp: exp.getTime() / 1000,
      },
      secret,
    );
  }

  public static generateCreateGroupDtoWithRandomTitle(words = 1) {
    const dto = new CreateGroupDto();
    dto.title = faker.lorem.words(words);
    return dto;
  }

  public generateConnectionPropertiesUserExcluded(
    tableName: string = null,
    tables_audit = true,
  ): CreateConnectionPropertiesDto {
    tableName = tableName || 'users';
    return {
      hidden_tables: [tableName],
      logo_url: faker.internet.url(),
      primary_color: faker.color.rgb(),
      secondary_color: faker.color.rgb(),
      hostname: faker.internet.url(),
      company_name: faker.company.name(),
      tables_audit: tables_audit,
      human_readable_table_names: faker.datatype.boolean(),
      allow_ai_requests: faker.datatype.boolean(),
      default_showing_table: null,
      table_categories: null,
    };
  }

  public generateNewTableAction(): TableActionEntity | CreateTableActionDTO {
    const newTableAction = new TableActionEntity();
    newTableAction.url = faker.internet.url();
    return newTableAction;
  }
}
