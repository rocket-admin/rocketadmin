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
    console.log('ConfigModule');
    console.log(configUrl);
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
