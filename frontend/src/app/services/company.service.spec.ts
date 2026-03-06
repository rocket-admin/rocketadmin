import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { CompanyService } from './company.service';

describe('CompanyService', () => {
	let service: CompanyService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [MatSnackBarModule],
			providers: [provideHttpClient()],
		});
		service = TestBed.inject(CompanyService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
