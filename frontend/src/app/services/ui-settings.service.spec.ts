import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { UiSettingsService } from './ui-settings.service';

describe('UiSettingsService', () => {
	let service: UiSettingsService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [MatSnackBarModule],
			providers: [provideHttpClient()],
		});
		service = TestBed.inject(UiSettingsService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
