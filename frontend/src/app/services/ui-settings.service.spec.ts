import { TestBed } from '@angular/core/testing';

import { UiSettingsService } from './ui-settings.service';

describe('UiSettingsService', () => {
  let service: UiSettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UiSettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
