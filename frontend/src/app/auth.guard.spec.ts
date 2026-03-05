import { inject, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [AuthGuard],
			imports: [RouterTestingModule],
		});
	});

	it('should ...', inject([AuthGuard], (guard: AuthGuard) => {
		expect(guard).toBeTruthy();
	}));
});
