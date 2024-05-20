import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TestBed } from '@angular/core/testing';
import { UiSettingsService } from './ui-settings.service';

describe('UiSettingsService', () => {
  let service: UiSettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MatSnackBarModule
      ],
    });
    service = TestBed.inject(UiSettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
