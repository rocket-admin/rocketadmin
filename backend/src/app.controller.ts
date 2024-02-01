import { Controller, Get, Inject, UseInterceptors } from '@nestjs/common';
import { UseCaseType } from './common/data-injection.tokens.js';
import { InTransactionEnum } from './enums/index.js';
import { SentryInterceptor } from './interceptors/index.js';
import { IGetHello } from './use-cases-app/use-cases-app.interface.js';
import { ApiTags } from '@nestjs/swagger';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiTags('app')
export class AppController {
  constructor(
    @Inject(UseCaseType.GET_HELLO)
    private readonly getHelloUseCase: IGetHello,
  ) {}

  @Get('/hello')
  async getHello(): Promise<string> {
    const connection = {
      description: 'connection to db 2',
      type: 'ibmdb2',
      title: 'connection to ibmdb2',
      host: 'db2server',
      port: 50000,
      username: 'db2inst1',
      password: 'password',
      database: 'testdb',
      schema: 'SCHEMA_NAME',
    };
    const dao = getDataAccessObject(connection);
    const tables = await dao.addRowInTable('USERS', { ID: 5, EMAIL: 'test@gmail.com', NAME: 'Vasia Pupkin' }, null);
    console.log('🚀 ~ AppController ~ getHello ~ tables:', tables);
    return tables as any;
    return this.getHelloUseCase.execute(undefined, InTransactionEnum.OFF);
  }
}
