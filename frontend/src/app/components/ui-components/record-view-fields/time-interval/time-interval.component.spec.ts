import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimeIntervalRecordViewComponent } from './time-interval.component';

describe('TimeIntervalRecordViewComponent', () => {
	let component: TimeIntervalRecordViewComponent;
	let fixture: ComponentFixture<TimeIntervalRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TimeIntervalRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(TimeIntervalRecordViewComponent);
		component = fixture.componentInstance;
		// Don't call fixture.detectChanges() here - let individual tests set inputs first
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should format interval object', () => {
		fixture.componentRef.setInput('value', { hours: 2, minutes: 30 });
		component.ngOnInit();
		expect(component.formattedInterval).toBe('2h 30m');
	});

	it('should display em dash for null value', () => {
		fixture.componentRef.setInput('value', null);
		component.ngOnInit();
		expect(component.formattedInterval).toBe('—');
	});

	it('should handle string JSON interval', () => {
		fixture.componentRef.setInput('value', '{"hours":1,"minutes":15}');
		component.ngOnInit();
		expect(component.formattedInterval).toBe('1h 15m');
	});
});
