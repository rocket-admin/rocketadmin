import test from 'ava';
import { Test } from '@nestjs/testing';
import { ApplicationModule } from '../../src/app.module.js';
import { DatabaseModule } from '../../src/shared/database/database.module.js';
import { DatabaseService } from '../../src/shared/database/database.service.js';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { registerUserOnSaasAndReturnUserInfo } from '../utils/register-user-and-return-user-info.js';

let app: INestApplication;

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService],
  }).compile();
  app = moduleFixture.createNestApplication();
  await app.init();
});

test(' > get hello', async (t) => {
  const result = await request(app.getHttpServer()).get('/hello');
  const responseText = result.text;
  t.assert('Hello World!', responseText);
  t.pass();
});
