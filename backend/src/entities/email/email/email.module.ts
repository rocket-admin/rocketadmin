import { Global, Module } from '@nestjs/common';
import { EmailConfigService } from '../email-config/email-config.service.js';
import { NunjucksModule } from '../template-engine/nunjucks.module.js';
import { EmailTransporterService } from '../transporter/email-transporter-service.js';
import { EmailService } from './email.service.js';

@Global()
@Module({
	imports: [NunjucksModule],
	controllers: [],
	providers: [EmailService, EmailConfigService, EmailTransporterService],
	exports: [EmailService],
})
export class EmailModule {}
