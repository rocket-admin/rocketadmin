import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { ConfigurationService } from './configuration.service';
import { TokenInterceptor } from './token.interceptor';

describe('TokenInterceptor', () => {
	beforeEach(() =>
		TestBed.configureTestingModule({
			imports: [MatSnackBarModule, MatDialogModule],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				TokenInterceptor,
				{
					provide: ConfigurationService,
					useValue: { CONFIG_URL: 'https://app.rocketadmin.com/api' },
				},
			],
		}),
	);

	it('should be created', () => {
		const interceptor: TokenInterceptor = TestBed.inject(TokenInterceptor);
		expect(interceptor).toBeTruthy();
	});
});
