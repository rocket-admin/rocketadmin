import { Global, Module } from '@nestjs/common';
import { BaseSaasGatewayService } from './base-saas-gateway.service.js';
import { SaasCompanyGatewayService } from './saas-company-gateway.service.js';
import { SaasUserGatewayService } from './saas-user-gateway.service.js';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [BaseSaasGatewayService, SaasCompanyGatewayService, SaasUserGatewayService],
  exports: [BaseSaasGatewayService, SaasCompanyGatewayService, SaasUserGatewayService],
})
export class SaaSGatewayModule {}
