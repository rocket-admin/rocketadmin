import { Global, Module } from '@nestjs/common';
import { ClientMicroservice } from './client-microservice.service.js';

@Global()
@Module({
  imports: [],
  providers: [ClientMicroservice],
  exports: [ClientMicroservice],
})
export class ClientMicroserviceModule {}
