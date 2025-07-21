import { Global, Module } from '@nestjs/common';
import { WinstonLogger } from './winston-logger.js';

@Global()
@Module({
  providers: [WinstonLogger],
  exports: [WinstonLogger],
})
export class LoggingModule {}
