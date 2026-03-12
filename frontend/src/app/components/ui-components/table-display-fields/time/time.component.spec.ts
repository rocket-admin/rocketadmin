import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimeDisplayComponent } from './time.component';

describe('TimeDisplayComponent', () => {
	let component: TimeDisplayComponent;
	let fixture: ComponentFixture<TimeDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TimeDisplayComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(TimeDisplayComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should format time string', () => {
		fixture.componentRef.setInput('value', '14:30:00');
		component.ngOnInit();
		fixture.detectChanges();

		expect(component.formattedTime).toBe('14:30:00');
	});

	it('should display dash for null', () => {
		fixture.componentRef.setInput('value', null);
		component.ngOnInit();
		fixture.detectChanges();

		expect(component.formattedTime).toBeUndefined();
	});
});
