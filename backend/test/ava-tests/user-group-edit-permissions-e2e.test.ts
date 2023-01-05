import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { ApplicationModule } from '../../src/app.module';
import { AccessLevelEnum } from '../../src/enums';
import { AllExceptionsFilter } from '../../src/exceptions/all-exceptions.filter';
import { Messages } from '../../src/exceptions/text/messages';
import { Cacher } from '../../src/helpers/cache/cacher';
import { Constants } from '../../src/helpers/constants/constants';
import { DatabaseModule } from '../../src/shared/database/database.module';
import { DatabaseService } from '../../src/shared/database/database.service';
import { MockFactory } from '../mock.factory';
import { TestUtils } from '../utils/test.utils';
import { createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions } from '../utils/user-with-different-permissions-utils';

let app: INestApplication;
let testUtils: TestUtils;
let currentTest: string;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const mockFactory = new MockFactory();
const newConnectionToPostgres = mockFactory.generateConnectionToTestPostgresDBInDocker();
const updateConnection = mockFactory.generateUpdateConnectionDto();
const newGroup1 = mockFactory.generateCreateGroupDto1();

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  app.getHttpServer().listen(0);
  testUtils = moduleFixture.get<TestUtils>(TestUtils);
});

test.after.always('Close app connection', async () => {
  try {
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('user group edit permissions e2e tests ' + e);
  }
});

//***************************************** USER NOT ADDED INTO ADMIN GROUP

//****************************** CONNECTION CONTROLLER

currentTest = 'GET /connections/';

test(`${currentTest} should return connections, where second user have access`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;
    const findAll = await request(app.getHttpServer())
      .get('/connections')
      .set('Content-Type', 'application/json')
      .set('Cookie', simpleUserToken)
      .set('Accept', 'application/json');

    t.is(findAll.status, 200);

    const result = findAll.body.connections;
    t.is(result.length, 5);
    t.is(result[0].hasOwnProperty('connection'), true);
    t.is(result[1].hasOwnProperty('accessLevel'), true);
    t.is(result[2].accessLevel, AccessLevelEnum.edit);
    t.is(uuidRegex.test(result[0].connection.id), true);
    t.is(result[3].hasOwnProperty('accessLevel'), true);
    t.is(result[4].connection.hasOwnProperty('host'), true);
    t.is(result[3].connection.hasOwnProperty('host'), true);
    t.is(typeof result[0].connection.port, 'number');
    t.is(result[1].connection.hasOwnProperty('port'), true);
    t.is(result[2].connection.hasOwnProperty('username'), true);
    t.is(result[3].connection.hasOwnProperty('database'), true);
    t.is(result[4].connection.hasOwnProperty('sid'), true);
    t.is(result[0].connection.hasOwnProperty('createdAt'), true);
    t.is(result[1].connection.hasOwnProperty('updatedAt'), true);
    t.is(result[2].connection.hasOwnProperty('password'), false);
    t.is(result[3].connection.hasOwnProperty('groups'), false);
    t.is(result[4].connection.hasOwnProperty('author'), false);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'GET /connection/one/:slug';

test(`${currentTest} should return a found connection`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const searchedConnectionId = connections.firstId;
    const findOneResponce = await request(app.getHttpServer())
      .get(`/connection/one/${searchedConnectionId}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', simpleUserToken)
      .set('Accept', 'application/json');
    t.is(findOneResponce.status, 200);

    const result = findOneResponce.body.connection;
    t.is(uuidRegex.test(result.id), true);
    t.is(result.title, newConnectionToPostgres.title);
    t.is(result.type, 'postgres');
    t.is(result.host, newConnectionToPostgres.host);
    t.is(typeof result.port, 'number');
    t.is(result.port, newConnectionToPostgres.port);
    t.is(result.username, 'postgres');
    t.is(result.database, newConnectionToPostgres.database);
    t.is(result.sid, null);
    t.is(result.hasOwnProperty('createdAt'), true);
    t.is(result.hasOwnProperty('updatedAt'), true);
    t.is(result.hasOwnProperty('password'), false);
    t.is(result.hasOwnProperty('groups'), false);
    t.is(result.hasOwnProperty('author'), false);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception, when you do not have permission in this connection`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const searchedConnectionId = connections.secondId;

    const findOneResponce = await request(app.getHttpServer())
      .get(`/connection/one/${searchedConnectionId}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', simpleUserToken)
      .set('Accept', 'application/json');

    // todo add checking connection object properties
    t.is(findOneResponce.status, 200);
    const findOneRO = JSON.parse(findOneResponce.text);
    t.is(findOneRO.hasOwnProperty('host'), false);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'PUT /connection';

test(`${currentTest} should throw exception you do not have permission`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const updateConnectionResponse = await request(app.getHttpServer())
      .put(`/connection/${connections.firstId}`)
      .send(updateConnection)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(updateConnectionResponse.status, 403);
    t.is(JSON.parse(updateConnectionResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should return throw an exception, when you try update a connection without permissions in it`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;
    const updateConnectionResponse = await request(app.getHttpServer())
      .put(`/connection/${connections.secondId}`)
      .send(updateConnection)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(updateConnectionResponse.status, 403);
    t.is(JSON.parse(updateConnectionResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'DELETE /connection/:slug';

test(`${currentTest} should throw an exception do not have permissions`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const response = await request(app.getHttpServer())
      .put(`/connection/delete/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(response.status, 403);
    t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);

    //deleted connection found in database
    const findOneResponce = await request(app.getHttpServer())
      .get(`/connection/one/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(findOneResponce.status, 200);
    t.is(JSON.parse(findOneResponce.text).connection.id, connections.firstId);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception, when you try to delete connection without permission`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const response = await request(app.getHttpServer())
      .put(`/connection/delete/${connections.secondId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(response.status, 403);
    t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);

    //connection wasn't deleted
    const findOneResponce = await request(app.getHttpServer())
      .get(`/connection/one/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(findOneResponce.status, 200);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'POST /connection/group/:slug';

test(`${currentTest} should throw an exception don not have permission`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createGroupResponse.status, 403);
    t.is(JSON.parse(createGroupResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when you try add group in connection without permission in it`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${connections.secondId}`)
      .set('Cookie', simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createGroupResponse.status, 403);
    t.is(JSON.parse(createGroupResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'PUT /connection/group/:slug';

test(`${currentTest} should return connection without deleted group result`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const newGroup1 = MockFactory.generateCreateGroupDtoWithRandomTitle();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${connections.firstId}`)
      .set('Cookie', adminUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    // create group in connection
    let result = createGroupResponse.body;
    t.is(createGroupResponse.status, 201);

    t.is(result.hasOwnProperty('id'), true);
    t.is(result.title, newGroup1.title);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    const response = await request(app.getHttpServer())
      .put(`/connection/group/delete/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .send({ groupId: createGroupRO.id })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    //after deleting group
    result = response.body;

    t.is(response.status, 403);
    t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception, when you try delete group in connection without permissions`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${connections.secondId}`)
      .set('Cookie', adminUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    // create group in connection
    const result = createGroupResponse.body;

    t.is(createGroupResponse.status, 201);

    t.is(result.hasOwnProperty('id'), true);
    t.is(result.title, newGroup1.title);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    const response = await request(app.getHttpServer())
      .put(`/connection/group/delete/${connections.secondId}`)
      .set('Cookie', simpleUserToken)
      .send({ groupId: createGroupRO.id })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(response.status, 403);
    t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'GET /connection/groups/:slug';

test(`${currentTest} should groups in connection`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const newRandomGroup2 = MockFactory.generateCreateGroupDtoWithRandomTitle();

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${connections.firstId}`)
      .set('Cookie', adminUserToken)
      .send(newRandomGroup2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createGroupResponse.status, 201);

    const response = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(response.status, 200);
    const result = JSON.parse(response.text);
    const groupId = result[0].group.id;
    t.is(uuidRegex.test(groupId), true);
    t.is(result[0].group.hasOwnProperty('title'), true);
    t.is(result[0].accessLevel, AccessLevelEnum.edit);

    const index = result.findIndex((el: any) => {
      return el.group.title === 'Admin';
    });

    t.is(index >= 0, false);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} it should throw an exception, when you try get groups in connection, where you do not have permission`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${connections.secondId}`)
      .set('Cookie', adminUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createGroupResponse.status, 201);

    const response = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.secondId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(response.status, 200);

    const result = JSON.parse(response.text);
    t.is(result.length, 0);
  } catch (e) {
    console.error(e);
  }
});

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} `, async (t) => {
//   try {
//     const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
//     const {
//       connections,
//       firstTableInfo,
//       groups,
//       permissions,
//       secondTableInfo,
//       users: { adminUserToken, simpleUserToken },
//     } = testData;

//   } catch (e) {
//     console.error(e);
//   }
// });
