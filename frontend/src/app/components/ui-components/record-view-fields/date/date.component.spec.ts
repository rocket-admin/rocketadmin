import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateRecordViewComponent } from './date.component';

describe('DateRecordViewComponent', () => {
	let component: DateRecordViewComponent;
	let fixture: ComponentFixture<DateRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DateRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(DateRecordViewComponent);
		component = fixture.componentInstance;
		// Don't call fixture.detectChanges() here - let individual tests set inputs first
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should format valid date', () => {
		component.value = '2023-04-29';
		component.ngOnInit();
		expect(component.formattedDate).toBeDefined();
	});

	it('should handle invalid date', () => {
		component.value = 'invalid';
		component.ngOnInit();
		expect(component.formattedDate).toBe('invalid');
	});

	it('should handle null value', () => {
		component.value = null;
		component.ngOnInit();
		expect(component.formattedDate).toBeUndefined();
	});
});
