import { Test, TestingModule } from '@nestjs/testing';
import { TableController } from './table.controller';
import { Messages } from '../../exceptions/text/messages';
import { TableServiceMock } from '../../../test/mocks/services';
import { MockFactory } from '../../../test/mock.factory';

xdescribe('Table Controller', () => {
  let tableController: TableController;
  const searchFieldValue = undefined;
  const request = MockFactory.getMockRequest();
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TableController],
      providers: [TableServiceMock],
    }).compile();
    tableController = module.get<TableController>(TableController);
  });

  it('should be defined', () => {
    expect(tableController).toBeDefined();
  });

  describe('findAllRows', () => {
    it('should return array of founded rows', async () => {
      const params = {
        slug: 'cb649d70-f0dd-4280-abca-24852d4e9ae0',
      };
      const tableName = 'customers';
      const page = 1;
      const perPage = 2;
      const query = '';

      const data = await tableController.findAllRows(
        request,
        tableName,
        page,
        perPage,
        searchFieldValue,
        query,
        params,
      );

      expect(typeof data.rows).toBe('object');
      expect(data.rows.length).toBe(3);
      expect(typeof data.rows[0]).toBe('object');
    });

    it("should throw an exception 'Id is missing' when connection id is undefined", async () => {
      const params = {
        slug: undefined,
      };
      const page = 1;
      const perPage = 2;
      const query = '';
      const tableName = 'customers';
      try {
        await tableController.findAllRows(request, tableName, page, perPage, searchFieldValue, params, query);
      } catch (e) {
        expect(e.message).toBe(Messages.CONNECTION_ID_MISSING);
      }
    });
  });

  describe('findTablesInConnection', () => {
    it('should return array of table names', async () => {
      const params = {
        slug: 'cb649d70-f0dd-4280-abca-24852d4e9ae0',
      };
      const result = await tableController.findTablesInConnection(request, params, 'true');
      expect(typeof result['tables']).toBe('object');
      expect(result['tables'].length).toBe(3);
    });

    it("should throw an exception 'Id is missing' when connection id is undefined", async () => {
      const params = {
        slug: undefined,
      };

      try {
        await tableController.findTablesInConnection(request, params, 'true');
      } catch (e) {
        expect(e.message).toBe(Messages.CONNECTION_ID_MISSING);
      }
    });
  });

  describe('getTableStructure', () => {
    it('should return array of table columns with primary key columns', async () => {
      const params = {
        slug: 'cb649d70-f0dd-4280-abca-24852d4e9ae0',
      };
      const tableName = 'customers';

      const receivedStructure = await tableController.getTableStructure(request, tableName, params);

      expect(typeof receivedStructure.structure).toBe('object');
      expect(typeof receivedStructure.structure).toBe('object');
      expect(receivedStructure.structure.length).toBe(5);
      expect(receivedStructure.structure[0].column_name).toBe('id');
      expect(receivedStructure.structure[1].column_default).toBe(null);
      expect(receivedStructure.structure[2].data_type).toBe('character varying');
      expect(typeof receivedStructure.primaryColumns).toBe('object');
    });

    it("should throw an exception 'Id is missing' when connection id is undefined", async () => {
      const params = {
        slug: undefined,
      };

      const tableName = 'customers';

      try {
        await tableController.getTableStructure(request, tableName, params);
      } catch (e) {
        expect(e.message).toBe(Messages.CONNECTION_ID_MISSING);
      }
    });
  });

  describe('addRowInTable', () => {
    it('should return added row id', async () => {
      const params = {
        slug: 'cb649d70-f0dd-4280-abca-24852d4e9ae0',
      };
      const body = {
        id: 4,
        firstname: 'Vasia',
        lastname: 'Pupkin',
        email: 'VasiaPupkin@gmail.com',
        age: 27,
      };
      const query = {};
      query['tableName'] = 'Test';

      const result = await tableController.addRowInTable(
        request,
        JSON.stringify(body),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        query,
        params,
      );
      expect(typeof result['row']).toBe('object');
      expect(result['row'].id).toBe(4);
      expect(result['row'].firstname).toBe('Vasia');
      expect(result['row'].lastname).toBe('Pupkin');
      expect(result['row'].email).toBe('VasiaPupkin@gmail.com');
      expect(result['row'].age).toBe(27);
    });

    it("should throw an exception 'Parameter is missing' when connection id is undefined", async () => {
      const params = {
        slug: undefined,
      };
      const body = {};
      const query = {
        tableName: 'Test',
      };

      try {
        await tableController.addRowInTable(request, JSON.stringify(body), JSON.stringify(query), params);
      } catch (e) {
        expect(e.message).toBe(Messages.PARAMETER_MISSING);
      }
    });

    it("should throw an exception 'Parameter is missing' when table name is undefined", async () => {
      const params = {
        slug: 'cb649d70-f0dd-4280-abca-24852d4e9ae0',
      };

      const body = {};
      const query = {
        tableName: undefined,
      };

      try {
        await tableController.addRowInTable(request, JSON.stringify(body), JSON.stringify(query), params);
      } catch (e) {
        expect(e.message).toBe(Messages.PARAMETER_MISSING);
      }
    });
  });

  describe('updateRowInTable', () => {
    xit('should return added row', async () => {
      const params = {
        slug: 'cb649d70-f0dd-4280-abca-24852d4e9ae0',
      };

      const body = {
        id: 4,
        firstname: 'Vasia',
        lastname: 'Pupkin',
        email: 'VasiaPupkin@gmail.com',
        age: 27,
      };
      const query = {
        tableName: 'Test',
      };
      const returnedResult = await tableController.updateRowInTable(
        request,
        JSON.stringify(body),
        params,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        query,
      );
      expect(returnedResult.hasOwnProperty('updatedRowId')).toBe(true);
      expect(typeof returnedResult).toBe('object');
      expect(typeof returnedResult.row).toBe('object');
      expect(returnedResult.row['id']).toBe(4);
      expect(returnedResult.row['firstname']).toBe('Vasia');
      expect(returnedResult.row['lastname']).toBe('Pupkin');
      expect(returnedResult.row['email']).toBe('VasiaPupkin@gmail.com');
      expect(returnedResult.row['age']).toBe(27);
    });

    it("should throw an exception 'Parameter is missing' when connection id is undefined", async () => {
      const params = {
        slug: undefined,
      };
      const body = {};
      const query = {
        tableName: 'Test',
      };

      try {
        await tableController.updateRowInTable(request, JSON.stringify(body), params, JSON.stringify(query));
      } catch (e) {
        expect(e.message).toBe(Messages.PARAMETER_MISSING);
      }
    });

    it("should throw an exception 'Parameter is missing' when table name is undefined", async () => {
      const params = {
        slug: 'cb649d70-f0dd-4280-abca-24852d4e9ae0',
      };
      const body = {};
      const query = {
        tableName: undefined,
      };
      try {
        await tableController.updateRowInTable(request, JSON.stringify(body), params, JSON.stringify(query));
      } catch (e) {
        expect(e.message).toBe(Messages.PARAMETER_MISSING);
      }
    });
  });

  xdescribe('getRowByPrimaryKey', () => {
    it('should return founded row', async () => {
      const params = {
        slug: 'cb649d70-f0dd-4280-abca-24852d4e9ae0',
      };
      const query = {
        tableName: 'Test',
      };
      const result = await tableController.getRowByPrimaryKey(request, params, JSON.stringify(query));
      expect(typeof result.row).toBe('object');
      expect(result.row['id']).toBe(4);
      expect(result.row['firstname']).toBe('Vasia');
      expect(result.row['lastname']).toBe('Pupkin');
      expect(result.row['email']).toBe('VasiaPupkin@gmail.com');
      expect(result.row['age']).toBe(27);
    });

    it("should throw an exception 'Parameter is missing' when connection id is undefined", async () => {
      const params = {
        slug: undefined,
      };

      const query = {
        tableName: 'Test',
      };

      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await tableController.getRowByPrimaryKey(request, params, query);
      } catch (e) {
        expect(e.message).toBe(Messages.PARAMETER_MISSING);
      }
    });

    it("should throw an exception 'Parameter is missing' when table name is undefined", async () => {
      const params = {
        slug: 'cb649d70-f0dd-4280-abca-24852d4e9ae0',
      };
      const query = {
        tableName: undefined,
      };
      try {
        await tableController.getRowByPrimaryKey(request, params, JSON.stringify(query));
      } catch (e) {
        expect(e.message).toBe(Messages.PARAMETER_MISSING);
      }
    });
  });
});
