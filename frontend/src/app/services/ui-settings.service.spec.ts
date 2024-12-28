import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TestBed } from '@angular/core/testing';
import { UiSettingsService } from './ui-settings.service';
import { provideHttpClient } from '@angular/common/http';

describe('UiSettingsService', () => {
  let service: UiSettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatSnackBarModule],
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(UiSettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
