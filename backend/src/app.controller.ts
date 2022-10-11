import { Controller, Get, Inject, Scope, UseInterceptors } from '@nestjs/common';
import { UseCaseType } from './common/data-injection.tokens';
import { InTransactionEnum } from './enums';
import { SentryInterceptor } from './interceptors';
import { IGetHello } from './use-cases-app/use-cases-app.interface';

@UseInterceptors(SentryInterceptor)
@Controller({ scope: Scope.REQUEST })
export class AppController {
  constructor(
    @Inject(UseCaseType.GET_HELLO)
    private readonly getHelloUseCase: IGetHello,
  ) {}

  @Get('/hello')
  async getHello(): Promise<string> {
    return this.getHelloUseCase.execute(undefined, InTransactionEnum.OFF);
  }
}
