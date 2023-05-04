import { faker } from '@faker-js/faker';
import { AppModule } from '../../src/app.module.js';
import { INestApplication } from '@nestjs/common';
import { Knex, knex } from 'knex';
import { Test } from '@nestjs/testing';
import { ICLIConnectionCredentials } from '../../src/interfaces/interfaces.js';
import { CommandExecutor } from '../../src/command/command-executor.js';
import { OperationTypeEnum } from '../../src/enums/operation-type.enum.js';
import { Constants } from '../../src/helpers/constants/constants.js';
import { QueryOrderingEnum } from '../../src/enums/query-ordering.enum.js';
import { DaoPostgres } from '../../src/dal/dao/dao-postgres.js';

describe('Command executor tests', () => {
  let app: INestApplication;
  const testTableName = 'users';
  const testTableColumnName = 'name';
  const testTAbleSecondColumnName = 'email';
  const testSearchedUserName = 'Vasia';
  const testEntitiesSeedsCount = 42;
  const connectionConfig: ICLIConnectionCredentials = {
    cert: '',
    database: 'ORCL',
    host: 'localhost',
    password: 'abc123',
    port: 1521,
    schema: null,
    sid: 'XE',
    ssl: false,
    type: 'oracledb',
    username: 'test',
    token: 'token',
    azure_encryption: false,
    app_port: 3000,
    application_save_option: false,
    config_encryption_option: false,
    encryption_password: undefined,
    saving_logs_option: false,
  };

  async function resetOracleTestDB() {
    const { host, username, password, database, port, type, ssl, cert, sid } = connectionConfig;
    const Knex = knex({
      client: type,
      connection: {
        user: username,
        database: database,
        password: password,
        connectString: `${host}:${port}/${sid ? sid : ''}`,
        ssl: ssl ? { ca: cert } : { rejectUnauthorized: false },
      },
    });
    await Knex.schema.dropTableIfExists(testTableName.toUpperCase());
    await Knex.schema.dropTableIfExists(testTableName);
    await Knex.schema.createTableIfNotExists(testTableName, function (table) {
      table.increments();
      table.string(testTableColumnName);
      table.string(testTAbleSecondColumnName);
      table.timestamps();
    });

    for (let i = 0; i < testEntitiesSeedsCount; i++) {
      if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
        await Knex(testTableName).insert({
          [testTableColumnName]: testSearchedUserName,
          [testTAbleSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      } else {
        await Knex(testTableName).insert({
          [testTableColumnName]: faker.name.findName(),
          [testTAbleSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
    await Knex.destroy();
  }

  beforeEach(async () => {
    jest.setTimeout(10000);
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication() as any;
    await app.init();
    await resetOracleTestDB();
  });

  afterAll(async () => {
    await DaoPostgres.clearKnexCache();
  });

  describe('execute command', () => {
    describe('addRowInTable command', () => {
      it('should return added row primary key when call add row in table', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const fakeName = faker.name.findName();
        const fakeMail = faker.internet.email();

        const row = {
          id: 999,
          [testTableColumnName]: fakeName,
          [testTAbleSecondColumnName]: fakeMail,
        };

        const commandData = {
          operationType: OperationTypeEnum.addRowInTable,
          tableName: testTableName,
          row: row,
          primaryKey: undefined,
          tableSettings: undefined,
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result.id).toBe(999);
      });

      it('should return an error when call add row in table without passed row', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const commandData = {
          operationType: OperationTypeEnum.addRowInTable,
          tableName: testTableName,
          row: undefined,
          primaryKey: undefined,
          tableSettings: undefined,
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result instanceof Error).toBeTruthy();
      });
    });

    describe('deleteRowInTable command', () => {
      it('should return 1 when call delete row in table', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const commandData = {
          operationType: OperationTypeEnum.deleteRowInTable,
          tableName: testTableName,
          row: undefined,
          primaryKey: { id: 1 },
          tableSettings: undefined,
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });

        expect(result).toBe(1);
      });

      it('should return an error when call delete row in table without primary key', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const commandData = {
          operationType: OperationTypeEnum.deleteRowInTable,
          tableName: testTableName,
          row: undefined,
          primaryKey: undefined,
          tableSettings: undefined,
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result instanceof Error).toBeTruthy();
      });
    });

    describe('getRowByPrimaryKey command', () => {
      it('should return row by primary key when call get row by primary key', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const commandData = {
          operationType: OperationTypeEnum.getRowByPrimaryKey,
          tableName: testTableName,
          row: undefined,
          primaryKey: { id: 1 },
          tableSettings: undefined,
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(1);
        expect(result[0].hasOwnProperty('name')).toBeTruthy();
        expect(result[0].hasOwnProperty('email')).toBeTruthy();
        expect(result[0].hasOwnProperty('created_at')).toBeTruthy();
        expect(result[0].hasOwnProperty('updated_at')).toBeTruthy();
      });

      it('should return an error when called get row by primary key without primary key', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const commandData = {
          operationType: OperationTypeEnum.getRowByPrimaryKey,
          tableName: testTableName,
          row: undefined,
          primaryKey: undefined,
          tableSettings: undefined,
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result instanceof Error).toBeTruthy();
      });
    });

    describe('getRowsFromTable command', () => {
      it('should return all rows when call get rows ', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const commandData = {
          operationType: OperationTypeEnum.getRowsFromTable,
          tableName: testTableName,
          row: undefined,
          primaryKey: undefined,
          tableSettings: {},
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });

        expect(result.data.length).toBe(20);
        expect(result.hasOwnProperty('pagination'));
        expect(result.pagination.total).toBe(testEntitiesSeedsCount);
        expect(result.pagination.perPage).toBe(Constants.DEFAULT_PAGINATION.perPage);
        expect(result.pagination.currentPage).toBe(Constants.DEFAULT_PAGINATION.page);
        expect(result.pagination.lastPage).toBe(
          Math.ceil(testEntitiesSeedsCount / Constants.DEFAULT_PAGINATION.perPage),
        );
      });

      it('should return an error when call get rows without table name', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const commandData = {
          operationType: OperationTypeEnum.getRowsFromTable,
          tableName: undefined,
          row: undefined,
          primaryKey: undefined,
          tableSettings: {},
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result instanceof Error).toBeTruthy();
      });
    });

    describe('getTableForeignKeys command', () => {
      it('should return all empty foreign keys array when called get table foreign keys', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const commandData = {
          operationType: OperationTypeEnum.getTableForeignKeys,
          tableName: testTableName,
          row: undefined,
          primaryKey: undefined,
          tableSettings: {},
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result.length).toBe(0);
      });

      it('should return an error when called get table foreign keys without table name', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const commandData = {
          operationType: OperationTypeEnum.getTableForeignKeys,
          tableName: undefined,
          row: undefined,
          primaryKey: undefined,
          tableSettings: {},
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result instanceof Error).toBeTruthy();
      });
    });

    describe('getTablePrimaryColumns command', () => {
      it('should return primary keys array when called get table primary column operation', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const commandData = {
          operationType: OperationTypeEnum.getTablePrimaryColumns,
          tableName: testTableName,
          row: undefined,
          primaryKey: undefined,
          tableSettings: {},
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result.length).toBe(1);
        expect(result[0].column_name).toBe('id');
      });

      it('should return an error when called get table primary column operation without table name', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const commandData = {
          operationType: OperationTypeEnum.getTablePrimaryColumns,
          tableName: undefined,
          row: undefined,
          primaryKey: undefined,
          tableSettings: {},
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result instanceof Error).toBeTruthy();
      });
    });

    describe('getTableStructure command', () => {
      it('should return table structure when called get table structure operation', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const commandData = {
          operationType: OperationTypeEnum.getTableStructure,
          tableName: testTableName,
          row: undefined,
          primaryKey: undefined,
          tableSettings: {},
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });

        expect(result.length).toBe(5);
        for (const element of result) {
          expect(element.hasOwnProperty('column_name')).toBeTruthy();
          expect(element.hasOwnProperty('column_default')).toBeTruthy();
          expect(element.hasOwnProperty('data_type')).toBeTruthy();
          expect(element.hasOwnProperty('character_maximum_length')).toBeTruthy();
          expect(element.hasOwnProperty('allow_null')).toBeTruthy();
        }
      });

      //todo
      xit('should return an error when called get table structure operation without table name', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const commandData = {
          operationType: OperationTypeEnum.getTableStructure,
          tableName: undefined,
          row: undefined,
          primaryKey: undefined,
          tableSettings: {},
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result instanceof Error).toBeTruthy();
      });
    });

    describe('getTablesFromDB command', () => {
      it('should return tables when called get tables from db operation', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const commandData = {
          operationType: OperationTypeEnum.getTablesFromDB,
          tableName: undefined,
          row: undefined,
          primaryKey: undefined,
          tableSettings: {},
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result.length).toBe(1);
        expect(result[0]).toBe(testTableName);
      });

      it('should return an exception when called get tables from db operation without operation type', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const commandData = {
          operationType: undefined,
          tableName: undefined,
          row: undefined,
          primaryKey: undefined,
          tableSettings: {},
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result instanceof Error).toBeTruthy();
      });
    });

    describe('updateRowInTable command', () => {
      it('should return 1 when called update table row primary key operation', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const fakeName = faker.name.findName();
        const fakeMail = faker.internet.email();

        const row = {
          [testTableColumnName]: fakeName,
          [testTAbleSecondColumnName]: fakeMail,
        };

        const primaryKey = {
          id: 1,
        };

        const commandData = {
          operationType: OperationTypeEnum.updateRowInTable,
          tableName: testTableName,
          row: row,
          primaryKey: primaryKey,
          tableSettings: {},
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result).toStrictEqual([]);
      });

      it('should return when called update row primary operation without row', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const primaryKey = {
          id: 1,
        };

        const commandData = {
          operationType: OperationTypeEnum.updateRowInTable,
          tableName: testTableName,
          row: undefined,
          primaryKey: primaryKey,
          tableSettings: {},
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result instanceof Error).toBeTruthy();
      });
    });

    describe('validateSettings command', () => {
      it('should return empty errors array when called validate settings operation', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const settings = {
          connection_id: faker.datatype.uuid(),
          table_name: testTableName,
          display_name: '',
          search_fields: [testTableColumnName],
          excluded_fields: undefined,
          list_fields: undefined,
          identification_fields: undefined,
          list_per_page: undefined,
          ordering: QueryOrderingEnum.ASC,
          ordering_field: undefined,
          readonly_fields: undefined,
          sortable_by: undefined,
          autocomplete_columns: undefined,
          custom_fields: undefined,
          table_widgets: undefined,
        };

        const commandData = {
          operationType: OperationTypeEnum.validateSettings,
          tableName: testTableName,
          row: undefined,
          primaryKey: undefined,
          tableSettings: settings,
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result.length).toBe(0);
      });

      it('should return an error array with error when called validate settings operation with wrong search field', async () => {
        const commandExecutor = new CommandExecutor(connectionConfig);

        const settings = {
          connection_id: faker.datatype.uuid(),
          table_name: testTableName,
          display_name: '',
          search_fields: [faker.random.words(1)],
          excluded_fields: undefined,
          list_fields: undefined,
          identification_fields: undefined,
          list_per_page: undefined,
          ordering: QueryOrderingEnum.ASC,
          ordering_field: undefined,
          readonly_fields: undefined,
          sortable_by: undefined,
          autocomplete_columns: undefined,
          custom_fields: undefined,
          table_widgets: undefined,
        };

        const commandData = {
          operationType: OperationTypeEnum.validateSettings,
          tableName: testTableName,
          row: undefined,
          primaryKey: undefined,
          tableSettings: settings,
          page: undefined,
          perPage: undefined,
          searchedFieldValue: undefined,
          filteringFields: undefined,
          autocompleteFields: undefined,
          fieldValues: undefined,
          identityColumnName: undefined,
          referencedFieldName: undefined,
          email: 'test@testmail.com',
        };

        const result = await commandExecutor.executeCommand({
          data: commandData as any,
        });
        expect(result.length).toBe(1);
      });
    });
  });
});
