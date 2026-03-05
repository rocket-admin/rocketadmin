import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NgxStripeModule } from 'ngx-stripe';
import { PaymentFormComponent } from './payment-form.component';

describe('PaymentFormComponent', () => {
	let component: PaymentFormComponent;
	let fixture: ComponentFixture<PaymentFormComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [RouterTestingModule, MatSnackBarModule, NgxStripeModule.forRoot('asdf'), PaymentFormComponent],
			providers: [
				provideHttpClient(),
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: {
							queryParams: {
								plan: 'team',
								period: 'monthly',
							},
						},
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(PaymentFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
