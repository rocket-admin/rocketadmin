/* eslint-disable @typescript-eslint/camelcase */
import { TableService } from '../../../src/entities/table/table.service';

export const TableServiceMock = {
  provide: TableService,
  useValue: {
    findAllRows: jest
      .fn()
      .mockResolvedValue(
        {
          rows:
            [
              {
                id: 2,
                firstname: 'Vasia',
                lastname: 'Pupkin',
                email: 'VasiaPupkin@gmail.com',
                age: 42,
              },
              {
                id: 3,
                firstname: 'Kolia',
                lastname: 'Ivanov',
                email: 'Kolian_Iv@gmail.com',
                age: 18,
              },
              {
                id: 4,
                firstname: 'Evgenii',
                lastname: 'Petrov',
                email: 'PeEvg@gmail.com',
                age: 27,
              },
            ],
          primaryColumns: [{ column_name: 'id' }],
          pagination: {},
          sortable_by: [],
          structure: [{}],
          foreignKeys: [],
        },
      ),

    findTablesInConnection: jest
      .fn()
      .mockResolvedValue({
        tables: [
          {
            table: 'pigs',
            permissions: {},
          },
          {
            table: 'customers',
            permissions: {},
          },
          {
            table: 'users',
            permissions: {},
          },
        ],
      }),

    getTableStructure: jest
      .fn()
      .mockResolvedValue({
        structure: [
          {
            column_name: 'id',
            column_default: `nextval('customers_id_seq'::regclass)`,
            data_type: 'integer',
          },
          {
            column_name: 'firstname',
            column_default: null,
            data_type: 'character varying',
          },
          {
            column_name: 'lastname',
            column_default: null,
            data_type: 'character varying',
          },
          {
            column_name: 'email',
            column_default: null,
            data_type: 'character varying',
          },
          {
            column_name: 'age',
            column_default: null,
            data_type: 'integer',
          },
        ],
        primaryColumns: [
          {
            attname: 'id',
            data_type: 'integer',
          },
        ],
      }),

    addRowInTable: jest
      .fn()
      .mockResolvedValue({
        row: {
          id: 4,
          firstname: 'Vasia',
          lastname: 'Pupkin',
          email: 'VasiaPupkin@gmail.com',
          age: 27,
        },
      }),

    updateRowInTable: jest
      .fn()
      .mockResolvedValue({
        row: {
          id: 4,
          firstname: 'Vasia',
          lastname: 'Pupkin',
          email: 'VasiaPupkin@gmail.com',
          age: 27,
        },
      }),

    getRowByPrimaryKey: jest
      .fn()
      .mockResolvedValue({
        id: 4,
        firstname: 'Vasia',
        lastname: 'Pupkin',
        email: 'VasiaPupkin@gmail.com',
        age: 27,
      }),
  },
};
