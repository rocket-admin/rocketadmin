import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateTimeRecordViewComponent } from './date-time.component';

describe('DateTimeRecordViewComponent', () => {
	let component: DateTimeRecordViewComponent;
	let fixture: ComponentFixture<DateTimeRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DateTimeRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(DateTimeRecordViewComponent);
		component = fixture.componentInstance;
		// Don't call fixture.detectChanges() here - let individual tests set inputs first
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should format valid datetime', () => {
		component.value = '2023-04-29T14:30:00';
		component.ngOnInit();
		expect(component.formattedDateTime).toBeDefined();
	});

	it('should handle invalid datetime', () => {
		component.value = 'invalid';
		component.ngOnInit();
		expect(component.formattedDateTime).toBe('invalid');
	});
});
