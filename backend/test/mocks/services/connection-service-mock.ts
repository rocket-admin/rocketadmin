import { ConnectionService } from '../../../src/entities/connection/connection.service';
import { AccessLevelEnum } from '../../../src/enums';

export const ConnectionServiceMock = {

  provide: ConnectionService,
  useValue: {
    findOne: jest
      .fn()
      .mockResolvedValue({
        title: 'test connection one',
        type: 'postgres',
        host: 'testDB',
        port: 5432,
        username: 'postgres',
        database: 'usersdb',
        createdAt: '2020-07-23T12:22:44.007Z',
        updatedAt: new Date(),
        sid: null,
        author: {
          id: '87cdc6c3-ed8d-4b7c-890f-3ccc16b22c7f',
          isActive: true,
        },
        id: '55c244fd-d1ab-4e7f-b458-6980e8a48f99',
      }),

    findAllAuthor: jest
      .fn()
      .mockResolvedValue({
        connections: [
          {
            id: '102854ee-e99d-4c19-9d72-f0683a67f211',
            title: 'connection',
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'postgres',
            database: 'usersdb',
            createdAt: '2020-07-23T12:22:44.007Z',
            updatedAt: '2020-07-23T12:22:44.007Z',
            sid: null,
            author: {
              id: '87cdc6c3-ed8d-4b7c-890f-3ccc16b22c7f',
              isActive: true,
            },
          },
          {
            id: '55c244fd-d1ab-4e7f-b458-6980e8a48f99',
            title: 'connection',
            type: 'mysql',
            host: 'localhost',
            port: 5432,
            username: 'postgres',
            database: 'db',
            createdAt: '2020-07-22T12:22:55.501Z',
            updatedAt: '2020-07-22T12:22:55.501Z',
            sid: null,
            author: {
              id: '87cdc6c3-ed8d-4b7c-890f-3ccc16b22c7f',
              isActive: true,
            },
          },
        ],
      }),

    findAll: jest
      .fn()
      .mockResolvedValue({
        connections: [
          {
            connection: {
              id: '102854ee-e99d-4c19-9d72-f0683a67f211',
              title: 'connection',
              type: 'mysql',
              host: 'localhost',
              port: 8000,
              username: 'postgres',
              database: 'usersdb',
              createdAt: '2020-07-23T12:22:44.007Z',
              updatedAt: '2020-07-23T12:22:44.007Z',
              sid: null,
              author: {
                id: '87cdc6c3-ed8d-4b7c-890f-3ccc16b22c7f',
                isActive: true,
              },
            },
            accessLevel: AccessLevelEnum.edit,
          },
          {
            connection: {
              id: '55c244fd-d1ab-4e7f-b458-6980e8a48f99',
              title: 'connection',
              type: 'mysql',
              host: 'google.com',
              port: 5432,
              username: 'postgres',
              database: 'usersdb',
              createdAt: '2020-07-22T12:22:55.501Z',
              updatedAt: '2020-07-22T12:22:55.501Z',
              sid: null,
              author: {
                id: '87cdc6c3-ed8d-4b7c-890f-3ccc16b22c7f',
                isActive: true,
              },
            },
            accessLevel: AccessLevelEnum.edit,
          },
        ],
      }),

    create: jest
      .fn()
      .mockResolvedValue({
        id: '6952220b-7c64-4c1f-a6f1-00385cde8e6d',
        title: 'Mock connection',
        type: 'mysql',
        host: 'mockDB',
        port: 8080,
        username: 'admin',
        database: 'mockAdminDb',
        sid: null,
        createdAt: '2020-07-24T07:18:37.060Z',
        updatedAt: '2020-07-24T07:18:37.060Z',
        groups: [
          {
            id: 'd1036cae-dd4c-4612-a7a4-ed623d4ac49b',
            title: 'Admin',
          },
        ],
      }),

    update: jest
      .fn()
      .mockResolvedValue({
        connection: {
          id: '6952220b-7c64-4c1f-a6f1-00385cde8e6d',
          title: 'Update Mock connection',
          type: 'mysql2',
          host: 'mockDB',
          port: 8080,
          username: 'admin',
          database: 'mockAdminDb',
          sid: null,
          createdAt: '2020-07-24T07:18:37.060Z',
          updatedAt: '2020-07-25T07:18:37.060Z',
        },
      }),

    delete: jest
      .fn()
      .mockResolvedValue({
        title: 'Update Mock connection',
        type: 'mysql2',
        host: 'mockDB',
        port: 8080,
        username: 'admin',
        password: 'admin123',
        database: 'mockAdminDb',
        sid: null,
        createdAt: '2020-07-24T07:18:37.060Z',
        updatedAt: '2020-07-24T07:25:53.698Z',
      }),

    addGroupInConnection: jest
      .fn()
      .mockResolvedValue({
        id: '102854ee-e99d-4c19-9d72-f0683a67f211',
        title: 'connection',
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        database: 'usersdb',
        sid: null,
        createdAt: '2020-07-23T12:22:44.007Z',
        updatedAt: '2020-07-23T12:22:44.007Z',
        groups: [
          {
            id: '879eba1d-8d19-493a-b333-1a8119034a24',
            title: 'Admin',
          },
          {
            id: '102854ee-e99d-4c19-9d72-f0683a67f211',
            title: 'test',
          },
        ],
      }),

    deleteGroupFromConnection: jest
      .fn()
      .mockResolvedValue({
        id: '102854ee-e99d-4c19-9d72-f0683a67f211',
        title: 'connection',
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        database: 'usersdb',
        sid: null,
        createdAt: '2020-07-23T12:22:44.007Z',
        updatedAt: '2020-07-23T12:22:44.007Z',
        groups: [
          {
            id: '879eba1d-8d19-493a-b333-1a8119034a24',
            title: 'Admin',
          },
        ],
      }),

    createGroupInConnection: jest
      .fn()
      .mockResolvedValue({
        title: 'test2',
        users: [
          {
            id: '87cdc6c3-ed8d-4b7c-890f-3ccc16b22c7f',
            isActive: true,
          },
        ],
        id: '8a71ebd5-cfb6-4727-8272-9ac0f5d457b8',
      }),

    getGroupsInConnection: jest
      .fn()
      .mockResolvedValue(
        [
          {
            id: '879eba1d-8d19-493a-b333-1a8119034a24',
            title: 'Admin',
          },
          {
            id: '8a71ebd5-cfb6-4727-8272-9ac0f5d457b8',
            title: 'test2',
          },
        ],
      ),

    getPermissionsForGroupInConnection: jest
      .fn()
      .mockResolvedValue({
        connection: {
          connectionId: '55c244fd-d1ab-4e7f-b458-6980e8a48f99',
          accessLevel: 'None',
        },
        group: {
          groupId: '0fec14cf-8fb3-4a3d-a364-d55729e1347c',
          accessLevel: 'Edit',
        },
        tables: [
          {
            tableName: 'customers',
            accessLevel: {
              visibility: false,
              readonly: true,
              add: true,
              delete: false,
              edit: false,
            },
          },
          {
            tableName: 'users',
            accessLevel: {
              visibility: true,
              readonly: false,
              add: false,
              delete: false,
              edit: false,
            },
          },
          {
            tableName: 'pigs',
            accessLevel: {
              visibility: false,
              readonly: false,
              add: false,
              delete: false,
              edit: false,
            },
          },
        ],
      }),

    findUser: jest
      .fn()
      .mockResolvedValue({
        id: '87cdc6c3-ed8d-4b7c-890f-3ccc16b22c7f',
        isActive: true,
        email: 'mockUser@test.mail.com',
        createdAt: new Date(),
      }),
  },
};
