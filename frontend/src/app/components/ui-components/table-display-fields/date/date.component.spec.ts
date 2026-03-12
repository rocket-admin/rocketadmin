import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateDisplayComponent } from './date.component';
import { format } from 'date-fns';

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

	it('should show relative date when formatDistanceWithinHours configured', () => {
		const now = new Date();
		const recentDate = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
		fixture.componentRef.setInput('value', recentDate.toISOString());
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { formatDistanceWithinHours: 48 },
		});
		component.ngOnInit();
		fixture.detectChanges();

		expect(component.formattedDate).toContain('ago');
	});
});
