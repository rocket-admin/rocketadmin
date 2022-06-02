import { Controller, Get, Inject, UseInterceptors } from '@nestjs/common';
import { SentryInterceptor } from './interceptors';
import { UseCaseType } from './common/data-injection.tokens';
import { IGetHello } from './use-cases-app/use-cases-app.interface';

@UseInterceptors(SentryInterceptor)
@Controller()
export class AppController {
  constructor(
    @Inject(UseCaseType.GET_HELLO)
    private readonly getHelloUseCase: IGetHello,
  ) {}

  @Get('/hello')
  async getHello(): Promise<string> {
    return this.getHelloUseCase.execute();
  }
}
