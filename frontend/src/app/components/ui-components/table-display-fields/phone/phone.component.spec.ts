import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhoneDisplayComponent } from './phone.component';

describe('PhoneDisplayComponent', () => {
	let component: PhoneDisplayComponent;
	let fixture: ComponentFixture<PhoneDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [PhoneDisplayComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(PhoneDisplayComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should format phone number', () => {
		fixture.componentRef.setInput('value', '+14155552671');
		component.ngOnInit();
		fixture.detectChanges();

		expect(component.formattedNumber).toBe('+1 415 555 2671');
		expect(component.countryName).toBe('United States');
	});

	it('should display raw value for invalid number', () => {
		fixture.componentRef.setInput('value', '12345');
		component.ngOnInit();
		fixture.detectChanges();

		expect(component.formattedNumber).toBe('12345');
	});
});
