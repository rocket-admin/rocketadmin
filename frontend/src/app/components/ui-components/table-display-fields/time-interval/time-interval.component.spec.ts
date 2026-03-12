import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimeIntervalDisplayComponent } from './time-interval.component';

describe('TimeIntervalDisplayComponent', () => {
	let component: TimeIntervalDisplayComponent;
	let fixture: ComponentFixture<TimeIntervalDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TimeIntervalDisplayComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(TimeIntervalDisplayComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should format interval object', () => {
		fixture.componentRef.setInput('value', { days: 2, hours: 5, minutes: 30 });
		component.ngOnInit();
		fixture.detectChanges();

		expect(component.formattedInterval).toBe('2d 5h 30m');
	});

	it('should display dash for null', () => {
		fixture.componentRef.setInput('value', null);
		component.ngOnInit();
		fixture.detectChanges();

		expect(component.formattedInterval).toBe('\u2014');
	});
});
