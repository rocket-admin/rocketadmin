import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TimeIntervalEditComponent } from './time-interval.component';

describe('TimeIntervalEditComponent', () => {
	let component: TimeIntervalEditComponent;
	let fixture: ComponentFixture<TimeIntervalEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TimeIntervalEditComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(TimeIntervalEditComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should have default empty interval values', () => {
		expect(component.interval.years).toBe('');
		expect(component.interval.months).toBe('');
		expect(component.interval.days).toBe('');
		expect(component.interval.hours).toBe('');
		expect(component.interval.minutes).toBe('');
		expect(component.interval.seconds).toBe('');
		expect(component.interval.milliseconds).toBe('');
	});

	it('should assign value to interval on init when value exists', () => {
		const intervalValue = {
			years: '1',
			months: '2',
			days: '3',
			hours: '4',
			minutes: '30',
			seconds: '0',
			milliseconds: '0',
		};
		component.value = intervalValue;
		component.ngOnInit();
		expect(component.interval).toBe(intervalValue);
	});

	it('should keep default interval when value is falsy on init', () => {
		component.value = null;
		component.ngOnInit();
		expect(component.interval.years).toBe('');
	});

	it('should emit postgres interval string on input change', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		component.interval = {
			years: '1',
			months: '0',
			days: '5',
			hours: '0',
			minutes: '0',
			seconds: '0',
			milliseconds: '0',
		};
		component.onInputChange();
		expect(component.onFieldChange.emit).toHaveBeenCalled();
		const emittedValue = (component.onFieldChange.emit as any).mock.calls[0][0];
		expect(typeof emittedValue).toBe('string');
	});
});
