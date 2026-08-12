import { Global, Module } from '@nestjs/common';
import { BaseSaasGatewayService } from './base-saas-gateway.service.js';
import { SaasCompanyGatewayService } from './saas-company-gateway.service.js';
import { SaasEmailGatewayService } from './saas-email-gateway.service.js';

@Global()
@Module({
	imports: [],
	controllers: [],
	providers: [BaseSaasGatewayService, SaasCompanyGatewayService, SaasEmailGatewayService],
	exports: [BaseSaasGatewayService, SaasCompanyGatewayService, SaasEmailGatewayService],
})
export class SaaSGatewayModule {}
