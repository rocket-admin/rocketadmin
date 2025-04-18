import test from 'ava';
import { Test } from '@nestjs/testing';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';

let app: INestApplication;

test.before(async () => {
  setSaasEnvVariable();
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService],
  }).compile();
  app = moduleFixture.createNestApplication();
  await app.init();
});

test.after(async () => {
  try {
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('After tests error ' + e);
  }
});

test.serial(' > get hello', async (t) => {
  const result = await request(app.getHttpServer()).get('/hello');
  const responseText = result.text;
  t.assert('Hello World!', responseText);
  t.pass();
});
