import { HttpClientModule } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { ConfigurationService } from '../services/configuration.service';

@NgModule({
	providers: [ConfigurationService],
	imports: [HttpClientModule],
})
export class ConfigModule {
	static buildForConfigUrl(configUrl: string): ModuleWithProviders<ConfigModule> {
		return {
			ngModule: ConfigModule,
			providers: [
				{
					provide: 'CONFIG_URL',
					useValue: configUrl,
				},
			],
		};
	}
}
