import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { UpgradeSuccessComponent } from './upgrade-success.component';

describe('UpgradeSuccessComponent', () => {
	let component: UpgradeSuccessComponent;
	let fixture: ComponentFixture<UpgradeSuccessComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MatSnackBarModule, UpgradeSuccessComponent],
			providers: [
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: {
							queryParams: {
								plan: 'free',
							},
						},
					},
				},
				// { provide: Router, useValue: routerSpy },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(UpgradeSuccessComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
