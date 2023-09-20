/* eslint-disable @typescript-eslint/no-unused-vars */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AccessLevelEnum } from '../../src/enums/index.js';
import { MockFactory } from '../mock.factory.js';
import { CreatedTableInfo, createTestTable } from './create-test-table.js';
import {
  inviteUserInCompanyAndAcceptInvitation,
  registerUserAndReturnUserInfo,
} from './register-user-and-return-user-info.js';

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
  const simpleUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(
    connectionAdminUserInfo.token,
    undefined,
    app,
  );
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
  const createSecondConnectionRO = JSON.parse(createSecondConnectionResponse.text);
  connectionsId.secondId = createSecondConnectionRO.id;
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

  await request(app.getHttpServer())
    .put('/group/user')
    .set('Cookie', connectionAdminUserToken)
    .send({ groupId, email })
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  connectionsId.firstAdminGroupId = groupId;

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
      simpleUserEmail: simpleUserRegisterInfo.email,
      adminUserEmail: connectionAdminUserInfo.email,
    },
  };
}

export async function createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(
  app: INestApplication,
): Promise<IUserDifferentTableOnlyPermissionsFooData> {
  const connectionsId = {
    firstId: null,
    secondId: null,
    firstAdminGroupId: null,
  };
  const mockFactory = new MockFactory();
  const connectionAdminUserInfo = await registerUserAndReturnUserInfo(app);
  const simpleUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(
    connectionAdminUserInfo.token,
    undefined,
    app,
  );
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

  const getGroupsResponse = await request(app.getHttpServer())
    .get(`/connection/groups/${connectionsId.firstId}`)
    .set('Cookie', connectionAdminUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const getGroupsRO = JSON.parse(getGroupsResponse.text);

  const firstAdminGroupId = getGroupsRO[0].group.id;

  const createSecondConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .set('Cookie', connectionAdminUserToken)
    .send(newConnection2)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createSecondConnectionRO = JSON.parse(createSecondConnectionResponse.text);
  connectionsId.secondId = createSecondConnectionRO.id;
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
      accessLevel: AccessLevelEnum.readonly,
    },
    group: {
      groupId: groupId,
      accessLevel: AccessLevelEnum.edit,
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

  await request(app.getHttpServer())
    .put('/group/user')
    .set('Cookie', connectionAdminUserToken)
    .send({ groupId, email })
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
      firstAdminGroupId: firstAdminGroupId,
      secondAdminGroupId: null,
      createdGroupId: groupId,
    },
    users: {
      adminUserToken: connectionAdminUserToken,
      simpleUserToken: simpleUserToken,
      simpleUserEmail: simpleUserRegisterInfo.email,
      adminUserEmail: connectionAdminUserInfo.email,
    },
  };
}

export async function createConnectionsAndInviteNewUserInNewGroupWithOnlyTablePermissions(
  app: INestApplication,
): Promise<IUserDifferentTableOnlyPermissionsFooData> {
  const connectionsId = {
    firstId: null,
    secondId: null,
    firstAdminGroupId: null,
  };
  const mockFactory = new MockFactory();
  const connectionAdminUserInfo = await registerUserAndReturnUserInfo(app);
  const simpleUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(
    connectionAdminUserInfo.token,
    undefined,
    app,
  );
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

  const getGroupsResponse = await request(app.getHttpServer())
    .get(`/connection/groups/${connectionsId.firstId}`)
    .set('Cookie', connectionAdminUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const getGroupsRO = JSON.parse(getGroupsResponse.text);

  const firstAdminGroupId = getGroupsRO[0].group.id;

  const createSecondConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .set('Cookie', connectionAdminUserToken)
    .send(newConnection2)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createSecondConnectionRO = JSON.parse(createSecondConnectionResponse.text);
  connectionsId.secondId = createSecondConnectionRO.id;
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

  await request(app.getHttpServer())
    .put('/group/user')
    .set('Cookie', connectionAdminUserToken)
    .send({ groupId, email })
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
      firstAdminGroupId: firstAdminGroupId,
      secondAdminGroupId: null,
      createdGroupId: groupId,
    },
    users: {
      adminUserToken: connectionAdminUserToken,
      simpleUserToken: simpleUserToken,
      simpleUserEmail: simpleUserRegisterInfo.email,
      adminUserEmail: connectionAdminUserInfo.email,
    },
  };
}

export async function createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
  app: INestApplication,
): Promise<IUserDifferentTableOnlyPermissionsFooData> {
  const connectionsId = {
    firstId: null,
    secondId: null,
    firstAdminGroupId: null,
  };
  const mockFactory = new MockFactory();
  const connectionAdminUserInfo = await registerUserAndReturnUserInfo(app);
  const simpleUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(
    connectionAdminUserInfo.token,
    undefined,
    app,
  );
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

  const getGroupsResponse = await request(app.getHttpServer())
    .get(`/connection/groups/${connectionsId.firstId}`)
    .set('Cookie', connectionAdminUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const getGroupsRO = JSON.parse(getGroupsResponse.text);

  const firstAdminGroupId = getGroupsRO[0].group.id;

  const createSecondConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .set('Cookie', connectionAdminUserToken)
    .send(newConnection2)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createSecondConnectionRO = JSON.parse(createSecondConnectionResponse.text);
  connectionsId.secondId = createSecondConnectionRO.id;
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
      accessLevel: AccessLevelEnum.readonly,
    },
    group: {
      groupId: groupId,
      accessLevel: AccessLevelEnum.readonly,
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

  await request(app.getHttpServer())
    .put('/group/user')
    .set('Cookie', connectionAdminUserToken)
    .send({ groupId, email })
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
      firstAdminGroupId: firstAdminGroupId,
      secondAdminGroupId: null,
      createdGroupId: groupId,
    },
    users: {
      adminUserToken: connectionAdminUserToken,
      simpleUserToken: simpleUserToken,
      simpleUserEmail: simpleUserRegisterInfo.email,
      adminUserEmail: connectionAdminUserInfo.email,
    },
  };
}

export async function createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(
  app: INestApplication,
): Promise<IUserDifferentTableOnlyPermissionsFooData> {
  const connectionsId = {
    firstId: null,
    secondId: null,
    firstAdminGroupId: null,
  };
  const mockFactory = new MockFactory();
  const connectionAdminUserInfo = await registerUserAndReturnUserInfo(app);
  const simpleUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(
    connectionAdminUserInfo.token,
    undefined,
    app,
  );
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
  if (createFirstConnectionResponse.status >= 300) {
    console.error('first connection creation error: ' + createFirstConnectionResponse.text);
  }
  const createFirstConnectionRO = JSON.parse(createFirstConnectionResponse.text);
  connectionsId.firstId = createFirstConnectionRO.id;
  const createSecondConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .set('Cookie', connectionAdminUserToken)
    .send(newConnection2)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  if (createSecondConnectionResponse.status >= 300) {
    console.error('second connection creation error: ' + createSecondConnectionResponse.text);
  }
  const createSecondConnectionRO = JSON.parse(createSecondConnectionResponse.text);
  connectionsId.secondId = createSecondConnectionRO.id;
  const email = simpleUserRegisterInfo.email;

  const getGroupsInFirstConnection = await request(app.getHttpServer())
    .get(`/connection/groups/${createFirstConnectionRO.id}`)
    .set('Cookie', connectionAdminUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const groupId = JSON.parse(getGroupsInFirstConnection.text)[0].group.id;

  const addUserInGroupResponce = await request(app.getHttpServer())
    .put('/group/user')
    .set('Cookie', connectionAdminUserToken)
    .send({ groupId, email })
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  connectionsId.firstAdminGroupId = groupId;

  if (addUserInGroupResponce.status >= 300) {
    console.error('user invitation error: ' + addUserInGroupResponce.text);
  }

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
      simpleUserEmail: simpleUserRegisterInfo.email,
      adminUserEmail: connectionAdminUserInfo.email,
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
    createdGroupId?: string;
  };
  users: {
    adminUserToken: string;
    simpleUserToken: string;
    simpleUserEmail: string;
    adminUserEmail: string;
  };
}
