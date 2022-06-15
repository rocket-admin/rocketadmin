import * as AWS from 'aws-sdk';
import * as AWSMock from 'aws-sdk-mock';
import * as faker from 'faker';
import * as request from 'supertest';

import { AccessLevelEnum } from '../src/enums';
import { ApplicationModule } from '../src/app.module';
import { Connection } from 'typeorm';
import { DaoPostgres } from '../src/dal/dao/dao-postgres';
import { DatabaseModule } from '../src/shared/database/database.module';
import { DatabaseService } from '../src/shared/database/database.service';
import { INestApplication } from '@nestjs/common';
import { Messages } from '../src/exceptions/text/messages';
import { MockFactory } from './mock.factory';
import { Test } from '@nestjs/testing';
import { TestUtils } from './utils/test.utils';

describe('Permissions (e2e)', () => {
  jest.setTimeout(10000);
  let app: INestApplication;
  let testUtils: TestUtils;
  const mockFactory = new MockFactory();
  let newConnection;
  let newConnectionInDocker;
  let newGroup1;
  let newCognitoUserName;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ApplicationModule, DatabaseModule],
      providers: [DatabaseService, TestUtils],
    }).compile();

    testUtils = moduleFixture.get<TestUtils>(TestUtils);
    await testUtils.resetDb();
    app = moduleFixture.createNestApplication();
    await app.init();

    newConnection = mockFactory.generateCreateConnectionDto();
    newConnectionInDocker = mockFactory.generateCreateInternalConnectionDto();
    newGroup1 = mockFactory.generateCreateGroupDto1();
    newCognitoUserName = mockFactory.generateCognitoUserName();

    const findAllConnectionsResponse = await request(app.getHttpServer())
      .get('/connections')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    expect(findAllConnectionsResponse.status).toBe(200);
  });

  afterEach(async () => {
    await testUtils.resetDb();
    await testUtils.closeDbConnection();
    await DaoPostgres.clearKnexCache();
  });

  beforeAll(() => {
    jest.setTimeout(30000);
  });

  afterAll(async () => {
    try {
      jest.setTimeout(5000);
      await testUtils.shutdownServer(app.getHttpAdapter());
      const connect = await app.get(Connection);
      if (connect.isConnected) {
        await connect.close();
      }
      await app.close();
    } catch (e) {
      console.error('After all permission error: ' + e);
    }
  });

  describe('PUT permissions/:slug', () => {
    xit('should return created permissions', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionInDocker)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        // console.log('-> createConnectionRO', createConnectionRO);
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createGroupRO = JSON.parse(createGroupResponse.text);
        expect(createGroupResponse.status).toBe(201);

        let connectionAccessLevel = AccessLevelEnum.none;
        let groupAccesssLevel = AccessLevelEnum.edit;
        let permissionsDTO = mockFactory.generateInternalPermissions(
          createConnectionRO.id,
          createGroupRO.id,
          connectionAccessLevel,
          groupAccesssLevel,
        );
        let dtoTables = permissionsDTO.permissions.tables;
        let createPermissionsResponse = await request(app.getHttpServer())
          .put(`/permissions/${createGroupRO.id}`)
          .send(permissionsDTO)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createPermissionsResponse.status).toBe(200);
        let createPermissionsRO = JSON.parse(createPermissionsResponse.text);
        expect(typeof createPermissionsRO).toBe('object');
        expect(typeof createPermissionsRO).toBe('object');
        expect(uuidRegex.test(createPermissionsRO.connection.connectionId)).toBeTruthy();
        expect(createPermissionsRO.connection.accessLevel).toBe(AccessLevelEnum.none);
        expect(uuidRegex.test(createPermissionsRO.group.groupId)).toBeTruthy();
        expect(createPermissionsRO.group.accessLevel).toBe(AccessLevelEnum.edit);
        expect(typeof createPermissionsRO.tables).toBe('object');
        let { tables } = createPermissionsRO;
        for (const table of tables) {
          const tableIndexInDto = dtoTables.findIndex((dtoTable) => {
            return dtoTable.tableName === table.tableName;
          });
          if (tableIndexInDto < 0) continue;
          const tableInDto = dtoTables[tableIndexInDto];
          const receivedAccessLevel = table.accessLevel;
          const dtoTableAccessLevel = tableInDto.accessLevel;
          expect(receivedAccessLevel.visibility).toBe(dtoTableAccessLevel.visibility);
          expect(receivedAccessLevel.readonly).toBe(dtoTableAccessLevel.readonly);
          expect(receivedAccessLevel.add).toBe(dtoTableAccessLevel.add);
          expect(receivedAccessLevel.delete).toBe(dtoTableAccessLevel.delete);
          expect(receivedAccessLevel.edit).toBe(dtoTableAccessLevel.edit);
        }

        connectionAccessLevel = AccessLevelEnum.readonly;
        groupAccesssLevel = AccessLevelEnum.none;
        permissionsDTO = mockFactory.generateInternalPermissions(
          createConnectionRO.id,
          createGroupRO.id,
          connectionAccessLevel,
          groupAccesssLevel,
        );
        dtoTables = permissionsDTO.permissions.tables;
        createPermissionsResponse = await request(app.getHttpServer())
          .put(`/permissions/${createGroupRO.id}`)
          .send(permissionsDTO)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createPermissionsResponse.status).toBe(200);
        createPermissionsRO = JSON.parse(createPermissionsResponse.text);
        expect(typeof createPermissionsRO).toBe('object');
        expect(typeof createPermissionsRO).toBe('object');
        expect(uuidRegex.test(createPermissionsRO.connection.connectionId)).toBeTruthy();
        expect(createPermissionsRO.connection.accessLevel).toBe(connectionAccessLevel);
        expect(uuidRegex.test(createPermissionsRO.group.groupId)).toBeTruthy();
        expect(createPermissionsRO.group.accessLevel).toBe(groupAccesssLevel);
        expect(typeof createPermissionsRO.tables).toBe('object');
        tables = createPermissionsRO.tables;
        for (const table of tables) {
          const tableIndexInDto = dtoTables.findIndex((dtoTable) => {
            return dtoTable.tableName === table.tableName;
          });
          if (tableIndexInDto < 0) continue;
          const tableInDto = dtoTables[tableIndexInDto];
          const receivedAccessLevel = table.accessLevel;
          const dtoTableAccessLevel = tableInDto.accessLevel;
          expect(receivedAccessLevel.visibility).toBe(dtoTableAccessLevel.visibility);
          expect(receivedAccessLevel.readonly).toBe(dtoTableAccessLevel.readonly);
          expect(receivedAccessLevel.add).toBe(dtoTableAccessLevel.add);
          expect(receivedAccessLevel.delete).toBe(dtoTableAccessLevel.delete);
          expect(receivedAccessLevel.edit).toBe(dtoTableAccessLevel.edit);
        }
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when groupId not passed', async () => {
      try {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock(
          'CognitoIdentityServiceProvider',
          'listUsers',
          (newCognitoUserName, callback: (...args: any) => void) => {
            callback(null, {
              Users: [
                {
                  Username: 'a876284a-e902-11ea-adc1-0242ac120002',
                  Attributes: [
                    {},
                    {},
                    {
                      Value: 'Example@gmail.com',
                    },
                  ],
                },
              ],
            });
          },
        );
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionInDocker)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        AWSMock.restore('CognitoIdentityServiceProvider');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createGroupRO = JSON.parse(createGroupResponse.text);
        expect(createGroupResponse.status).toBe(201);

        const firstTableName = faker.random.word(1);
        const secondTableName = faker.random.word(3);
        const connectionAccessLevel = AccessLevelEnum.none;
        const groupAccesssLevel = AccessLevelEnum.edit;
        const permissionsDTO = mockFactory.generatePermissions(
          createConnectionRO.id,
          createGroupRO.id,
          firstTableName,
          secondTableName,
          connectionAccessLevel,
          groupAccesssLevel,
        );

        createGroupRO.id = '';
        const createPermissionsResponse = await request(app.getHttpServer())
          .put(`/permissions/${createGroupRO.id}`)
          .send(permissionsDTO)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createPermissionsResponse.status).toBe(404);
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception, when groupId in request is incorrect', async () => {
      try {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock(
          'CognitoIdentityServiceProvider',
          'listUsers',
          (newCognitoUserName, callback: (...args: any) => void) => {
            callback(null, {
              Users: [
                {
                  Username: 'a876284a-e902-11ea-adc1-0242ac120002',
                  Attributes: [
                    {},
                    {},
                    {
                      Value: 'Example@gmail.com',
                    },
                  ],
                },
              ],
            });
          },
        );
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionInDocker)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createGroupRO = JSON.parse(createGroupResponse.text);
        expect(createGroupResponse.status).toBe(201);

        const firstTableName = faker.random.word(1);
        const secondTableName = faker.random.word(3);
        const connectionAccessLevel = AccessLevelEnum.none;
        const groupAccesssLevel = AccessLevelEnum.edit;
        const permissionsDTO = mockFactory.generatePermissions(
          createConnectionRO.id,
          createGroupRO.id,
          firstTableName,
          secondTableName,
          connectionAccessLevel,
          groupAccesssLevel,
        );

        createGroupRO.id = faker.random.uuid();

        const createPermissionsResponse = await request(app.getHttpServer())
          .put(`/permissions/${createGroupRO.id}`)
          .send(permissionsDTO)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createPermissionsResponse.status).toBe(400);
        const { message } = JSON.parse(createPermissionsResponse.text);
        expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception, when connecionId is incorrect', async () => {
      try {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock(
          'CognitoIdentityServiceProvider',
          'listUsers',
          (newCognitoUserName, callback: (...args: any) => void) => {
            callback(null, {
              Users: [
                {
                  Username: 'a876284a-e902-11ea-adc1-0242ac120002',
                  Attributes: [
                    {},
                    {},
                    {
                      Value: 'Example@gmail.com',
                    },
                  ],
                },
              ],
            });
          },
        );
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionInDocker)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createGroupRO = JSON.parse(createGroupResponse.text);
        expect(createGroupResponse.status).toBe(201);

        const firstTableName = faker.random.word(1);
        const secondTableName = faker.random.word(3);
        const connectionAccessLevel = AccessLevelEnum.none;
        const groupAccesssLevel = AccessLevelEnum.edit;
        const permissionsDTO = mockFactory.generatePermissions(
          createConnectionRO.id,
          createGroupRO.id,
          firstTableName,
          secondTableName,
          connectionAccessLevel,
          groupAccesssLevel,
        );

        permissionsDTO.permissions.connection.connectionId = faker.random.uuid();

        const createPermissionsResponse = await request(app.getHttpServer())
          .put(`/permissions/${createGroupRO.id}`)
          .send(permissionsDTO)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createPermissionsResponse.status).toBe(400);
        const { message } = JSON.parse(createPermissionsResponse.text);
        expect(message).toBe(`${Messages.GROUP_NOT_FROM_THIS_CONNECTION}`);
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });
  });
});
