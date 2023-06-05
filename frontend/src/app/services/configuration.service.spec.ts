import { ConfigurationService } from './configuration.service';
import { TestBed } from '@angular/core/testing';

describe('ConfigurationService', () => {
  let service: ConfigurationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ConfigurationService,
          useValue: { CONFIG_URL: 'https://app.rocketadmin.com/api' }
        }
      ]
    });
    service = TestBed.inject(ConfigurationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
