import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DateTimeFilterComponent } from './date-time.component';

describe('DateTimeFilterComponent', () => {
	let component: DateTimeFilterComponent;
	let fixture: ComponentFixture<DateTimeFilterComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DateTimeFilterComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(DateTimeFilterComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should default to last_day filter mode', () => {
		expect(component.filterMode).toEqual('last_day');
	});

	it('should prepare date and time for date and time inputs when value is provided', () => {
		component.value = '2021-06-26T07:22:00.603';
		component.ngOnInit();

		expect(component.date).toEqual('2021-06-26');
		expect(component.time).toEqual('07:22:00');
		expect(component.filterMode).toEqual('gte');
	});

	it('should send onChange event with new date value', () => {
		component.filterMode = 'gte';
		component.date = '2021-08-26';
		component.time = '07:22:00';
		const fieldEvent = vi.spyOn(component.onFieldChange, 'emit');
		const comparatorEvent = vi.spyOn(component.onComparatorChange, 'emit');
		component.onDateChange();

		expect(fieldEvent).toHaveBeenCalledWith('2021-08-26T07:22:00Z');
		expect(comparatorEvent).toHaveBeenCalledWith('gte');
	});

	it('should send onChange event with new time value', () => {
		component.filterMode = 'lt';
		component.date = '2021-07-26';
		component.time = '07:20:00';
		const fieldEvent = vi.spyOn(component.onFieldChange, 'emit');
		const comparatorEvent = vi.spyOn(component.onComparatorChange, 'emit');
		component.onTimeChange();

		expect(fieldEvent).toHaveBeenCalledWith('2021-07-26T07:20:00Z');
		expect(comparatorEvent).toHaveBeenCalledWith('lt');
	});

	it('should identify preset modes correctly', () => {
		component.filterMode = 'last_hour';
		expect(component.isPresetMode()).toBe(true);

		component.filterMode = 'last_day';
		expect(component.isPresetMode()).toBe(true);

		component.filterMode = 'last_week';
		expect(component.isPresetMode()).toBe(true);

		component.filterMode = 'last_month';
		expect(component.isPresetMode()).toBe(true);

		component.filterMode = 'last_year';
		expect(component.isPresetMode()).toBe(true);

		component.filterMode = 'eq';
		expect(component.isPresetMode()).toBe(false);

		component.filterMode = 'gt';
		expect(component.isPresetMode()).toBe(false);
	});

	it('should emit gte comparator and computed value for preset modes', () => {
		const fieldEvent = vi.spyOn(component.onFieldChange, 'emit');
		const comparatorEvent = vi.spyOn(component.onComparatorChange, 'emit');

		component.onFilterModeChange('last_hour');

		expect(comparatorEvent).toHaveBeenCalledWith('gte');
		expect(fieldEvent).toHaveBeenCalled();
		const emittedValue = fieldEvent.mock.calls[0][0] as string;
		expect(emittedValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
	});

	it('should emit correct comparator for custom modes', () => {
		const comparatorEvent = vi.spyOn(component.onComparatorChange, 'emit');

		component.onFilterModeChange('gt');
		expect(comparatorEvent).toHaveBeenCalledWith('gt');

		component.onFilterModeChange('lt');
		expect(comparatorEvent).toHaveBeenCalledWith('lt');

		component.onFilterModeChange('eq');
		expect(comparatorEvent).toHaveBeenCalledWith('eq');
	});

	it('should emit datetime value when switching to custom mode with existing date', () => {
		component.date = '2021-08-26';
		component.time = '10:00:00';
		const fieldEvent = vi.spyOn(component.onFieldChange, 'emit');

		component.onFilterModeChange('gt');

		expect(fieldEvent).toHaveBeenCalledWith('2021-08-26T10:00:00Z');
	});

	it('should default time to 00:00 on date change if time is not set', () => {
		component.filterMode = 'eq';
		component.date = '2021-08-26';
		component.time = undefined;
		const fieldEvent = vi.spyOn(component.onFieldChange, 'emit');
		component.onDateChange();

		expect(component.time).toEqual('00:00');
		expect(fieldEvent).toHaveBeenCalledWith('2021-08-26T00:00Z');
	});
});
