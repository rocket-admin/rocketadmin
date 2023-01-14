import test from 'ava';
import { Test } from '@nestjs/testing';
import { ApplicationModule } from '../../src/app.module';
import { DatabaseModule } from '../../src/shared/database/database.module';
import { DatabaseService } from '../../src/shared/database/database.service';
import { TestUtils } from '../utils/test.utils';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

let app: INestApplication;

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
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
