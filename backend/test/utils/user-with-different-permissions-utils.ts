import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AccessLevelEnum } from '../../src/enums';
import { MockFactory } from '../mock.factory';
import { CreatedTableInfo, createTestTable } from './create-test-table';
import { registerUserAndReturnUserInfo } from './register-user-and-return-user-info';

export async function createConnectionsAndInviteNewUserInNewGroupInFirstConnection(
  app: INestApplication,
): Promise<IUserDifferentTableOnlyPermissionsFooData> {
  const connectionsId = {
    firstId: null,
    secondId: null,
    firstAdminGroupId: null,
  };
  const mockFactory = new MockFactory();
  const connectionAdminUserInfo = await registerUserAndReturnUserInfo(app);
  const simpleUserRegisterInfo = await registerUserAndReturnUserInfo(app);
  const connectionAdminUserToken = connectionAdminUserInfo.token;
  const simpleUserToken = simpleUserRegisterInfo.token;

  const newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
  const newConnection2 = mockFactory.generateConnectionToTestMySQLDBInDocker();
  const newGroup1 = mockFactory.generateCreateGroupDto1();
  const firstTable = await createTestTable(newConnection);
  const secondTable = await createTestTable(newConnection2);

  const tablePermissions = {
    visibility: true,
    readonly: false,
    add: true,
    delete: true,
    edit: false,
  };

  const createFirstConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .set('Cookie', connectionAdminUserToken)
    .send(newConnection)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createFirstConnectionRO = JSON.parse(createFirstConnectionResponse.text);
  connectionsId.firstId = createFirstConnectionRO.id;
  const createSecondConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .set('Cookie', connectionAdminUserToken)
    .send(newConnection2)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const firstConnectionRO = JSON.parse(createSecondConnectionResponse.text);
  connectionsId.secondId = firstConnectionRO.id;
  const email = simpleUserRegisterInfo.email;

  const createGroupResponse = await request(app.getHttpServer())
    .post(`/connection/group/${connectionsId.firstId}`)
    .set('Cookie', connectionAdminUserToken)
    .send(newGroup1)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const groupId = JSON.parse(createGroupResponse.text).id;

  const permissions = {
    connection: {
      connectionId: connectionsId.firstId,
      accessLevel: AccessLevelEnum.none,
    },
    group: {
      groupId: groupId,
      accessLevel: AccessLevelEnum.none,
    },
    tables: [
      {
        tableName: firstTable.testTableName,
        accessLevel: tablePermissions,
      },
    ],
  };

  const createOrUpdatePermissionResponse = await request(app.getHttpServer())
    .put(`/permissions/${groupId}`)
    .send({ permissions })
    .set('Cookie', connectionAdminUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const findAllConnectionsResponse_2 = await request(app.getHttpServer())
    .get('/connections')
    .set('Cookie', simpleUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  await request(app.getHttpServer())
    .put('/group/user')
    .set('Cookie', connectionAdminUserToken)
    .send({ groupId, email })
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  connectionsId.firstAdminGroupId = groupId;

  const getUsers = await request(app.getHttpServer())
    .get(`/group/users/${groupId}`)
    .set('Cookie', connectionAdminUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  return {
    firstTableInfo: firstTable,
    secondTableInfo: secondTable,
    permissions: {
      table: {
        visibility: true,
        readonly: false,
        add: true,
        delete: true,
        edit: false,
      },
    },
    connections: {
      firstId: connectionsId.firstId,
      secondId: connectionsId.secondId,
    },
    groups: {
      firstAdminGroupId: groupId,
      secondAdminGroupId: null,
    },
    users: {
      adminUserToken: connectionAdminUserToken,
      simpleUserToken: simpleUserToken,
    },
  };
}

interface IUserDifferentTableOnlyPermissionsFooData {
  firstTableInfo: CreatedTableInfo;
  secondTableInfo: CreatedTableInfo;
  permissions: {
    table: {
      visibility: boolean;
      readonly: boolean;
      add: boolean;
      delete: boolean;
      edit: boolean;
    };
  };
  connections: {
    firstId: string;
    secondId: string;
  };
  groups: {
    firstAdminGroupId: string;
    secondAdminGroupId: string;
  };
  users: {
    adminUserToken: string;
    simpleUserToken: string;
  };
}
