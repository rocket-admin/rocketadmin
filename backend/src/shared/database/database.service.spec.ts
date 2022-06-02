import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';
import * as sinon from 'sinon';
import { Connection } from 'typeorm';
import { getConnectionToken } from '@nestjs/typeorm';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let sandbox: sinon.SinonSandbox;
  beforeAll(async () => {
    sandbox = sinon.createSandbox();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: getConnectionToken(),
          useValue: sandbox.createStubInstance(Connection),
        },
      ],
    }).compile();
    service = module.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    sandbox.restore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});