import { Controller, Get, Inject, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UseCaseType } from './common/data-injection.tokens.js';
import { Timeout } from './decorators/timeout.decorator.js';
import { InTransactionEnum } from './enums/index.js';
import { SentryInterceptor } from './interceptors/index.js';
import { IGetHello } from './use-cases-app/use-cases-app.interface.js';

@UseInterceptors(SentryInterceptor)
@Timeout()
@Controller()
@ApiTags('app')
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
