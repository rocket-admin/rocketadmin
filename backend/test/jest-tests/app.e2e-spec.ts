import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ApplicationModule } from '../../src/app.module.js';
import { DatabaseModule } from '../../src/shared/database/database.module.js';
import { DatabaseService } from '../../src/shared/database/database.service.js';
import { TestUtils } from '../utils/test.utils.js';
import { Connection } from 'typeorm';

describe('AppController (e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ApplicationModule, DatabaseModule],
      providers: [DatabaseService, TestUtils],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', async () => {
    return request(app.getHttpServer()).get('/hello').expect(200);
  });

  afterAll(async () => {
    const connect = await app.get(Connection);
    await connect.close();
    await app.close();
  });
});
