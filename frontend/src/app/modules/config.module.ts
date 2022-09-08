import { ModuleWithProviders, NgModule } from '@angular/core';

import { ConfigurationService } from '../services/configuration.service';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  providers: [ConfigurationService],
  imports: [
    HttpClientModule
  ]
})
export class ConfigModule {
  static buildForConfigUrl(configUrl: string): ModuleWithProviders<ConfigModule> {
    return {
      ngModule: ConfigModule,
      providers: [
        {
          provide: 'CONFIG_URL',
          useValue: configUrl
        }
      ]
    };
  }
}
