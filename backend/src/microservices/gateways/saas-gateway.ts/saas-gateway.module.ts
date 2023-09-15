import { Global, Module } from '@nestjs/common';
import { BaseSaasGatewayService } from './base-saas-gateway.service.js';
import { SaasCompanyGatewayService } from './saas-company-gateway.service.js';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [BaseSaasGatewayService, SaasCompanyGatewayService],
  exports: [BaseSaasGatewayService, SaasCompanyGatewayService],
})
export class SaaSGatewayModule {}
