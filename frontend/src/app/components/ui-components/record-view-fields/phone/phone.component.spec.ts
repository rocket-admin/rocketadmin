import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhoneRecordViewComponent } from './phone.component';

describe('PhoneRecordViewComponent', () => {
	let component: PhoneRecordViewComponent;
	let fixture: ComponentFixture<PhoneRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [PhoneRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(PhoneRecordViewComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should parse valid phone number', () => {
		fixture.componentRef.setInput('value', '+12025551234');
		component.ngOnInit();
		expect(component.formattedNumber).toBeDefined();
		expect(component.formattedNumber).not.toBe('');
	});

	it('should handle invalid phone number gracefully', () => {
		fixture.componentRef.setInput('value', 'not-a-phone');
		component.ngOnInit();
		expect(component.formattedNumber).toBe('not-a-phone');
	});

	it('should handle null value', () => {
		fixture.componentRef.setInput('value', null);
		component.ngOnInit();
		expect(component.formattedNumber).toBe('');
	});
});
