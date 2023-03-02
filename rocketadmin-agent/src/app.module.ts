import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.config.env',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
