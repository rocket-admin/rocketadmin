import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateTimeDisplayComponent } from './date-time.component';
import { format } from 'date-fns';

describe('DateTimeDisplayComponent', () => {
	let component: DateTimeDisplayComponent;
	let fixture: ComponentFixture<DateTimeDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DateTimeDisplayComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(DateTimeDisplayComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should format datetime value', () => {
		const dateStr = '2023-04-29T10:30:00Z';
		fixture.componentRef.setInput('value', dateStr);
		component.ngOnInit();
		fixture.detectChanges();

		const expected = format(new Date(dateStr), 'P p');
		expect(component.formattedDateTime).toBe(expected);
	});

	it('should display dash for null', () => {
		fixture.componentRef.setInput('value', null);
		component.ngOnInit();
		fixture.detectChanges();

		expect(component.formattedDateTime).toBeUndefined();
	});
});
