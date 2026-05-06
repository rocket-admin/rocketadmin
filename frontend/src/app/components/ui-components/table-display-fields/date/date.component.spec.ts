import { ComponentFixture, TestBed } from '@angular/core/testing';
import { format } from 'date-fns';
import { DateDisplayComponent } from './date.component';

describe('DateDisplayComponent', () => {
	let component: DateDisplayComponent;
	let fixture: ComponentFixture<DateDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DateDisplayComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(DateDisplayComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should format date value', () => {
		const dateStr = '2023-04-29';
		fixture.componentRef.setInput('value', dateStr);
		component.ngOnInit();
		fixture.detectChanges();

		const expected = format(new Date(dateStr), 'P');
		expect(component.formattedDate).toBe(expected);
	});

	it('should display dash for null', () => {
		fixture.componentRef.setInput('value', null);
		component.ngOnInit();
		fixture.detectChanges();

		expect(component.formattedDate).toBeUndefined();
	});

	it('should display "today" instead of relative time for same-day date', () => {
		const recentDate = new Date(Date.now() - 1000 * 60); // 1 minute ago — same calendar day
		fixture.componentRef.setInput('value', recentDate.toISOString());
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { formatDistanceWithinHours: 48 },
		});
		component.ngOnInit();
		fixture.detectChanges();

		expect(component.formattedDate).toBe('today');
	});

	it('should show relative date for non-today date within formatDistanceWithinHours', () => {
		const yesterdayNoon = new Date();
		yesterdayNoon.setDate(yesterdayNoon.getDate() - 1);
		yesterdayNoon.setHours(12, 0, 0, 0);
		fixture.componentRef.setInput('value', yesterdayNoon.toISOString());
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { formatDistanceWithinHours: 48 },
		});
		component.ngOnInit();
		fixture.detectChanges();

		expect(component.formattedDate).toContain('ago');
	});

	it('should expose exact date as tooltip via fullDate', () => {
		const dateStr = '2023-04-29';
		fixture.componentRef.setInput('value', dateStr);
		component.ngOnInit();
		fixture.detectChanges();

		expect(component.fullDate).toBe(format(new Date(dateStr), 'PPP'));
	});

	it('should set fullDate tooltip even when displaying "today"', () => {
		const recentDate = new Date(Date.now() - 1000 * 60);
		fixture.componentRef.setInput('value', recentDate.toISOString());
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { formatDistanceWithinHours: 48 },
		});
		component.ngOnInit();
		fixture.detectChanges();

		expect(component.formattedDate).toBe('today');
		expect(component.fullDate).toBe(format(recentDate, 'PPP'));
	});
});
