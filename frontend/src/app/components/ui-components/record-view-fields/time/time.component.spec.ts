import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimeRecordViewComponent } from './time.component';

describe('TimeRecordViewComponent', () => {
	let component: TimeRecordViewComponent;
	let fixture: ComponentFixture<TimeRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TimeRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(TimeRecordViewComponent);
		component = fixture.componentInstance;
		// Don't call fixture.detectChanges() here - let individual tests set inputs first
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should preserve time string format', () => {
		component.value = '14:30:00';
		component.ngOnInit();
		expect(component.formattedTime).toBe('14:30:00');
	});

	it('should handle null value', () => {
		component.value = null;
		component.ngOnInit();
		expect(component.formattedTime).toBeUndefined();
	});
});
