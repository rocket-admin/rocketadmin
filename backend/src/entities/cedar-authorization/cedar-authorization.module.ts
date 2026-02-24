import { Global, Module } from '@nestjs/common';
import { CedarAuthorizationService } from './cedar-authorization.service.js';

@Global()
@Module({
	providers: [CedarAuthorizationService],
	exports: [CedarAuthorizationService],
})
export class CedarAuthorizationModule {}
