import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RangeRecordViewComponent } from './range.component';

describe('RangeRecordViewComponent', () => {
	let component: RangeRecordViewComponent;
	let fixture: ComponentFixture<RangeRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [RangeRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(RangeRecordViewComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display value with default max', () => {
		fixture.componentRef.setInput('value', 50);
		component.ngOnInit();
		expect(component.displayValue).toBe('50 / 100');
	});

	it('should parse widget params for min/max', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { min: 0, max: 200 },
		});
		fixture.componentRef.setInput('value', 100);
		component.ngOnInit();
		expect(component.displayValue).toBe('100 / 200');
	});

	it('should calculate progress value', () => {
		fixture.componentRef.setInput('value', 50);
		component.ngOnInit();
		expect(component.getProgressValue()).toBe(50);
	});

	it('should clamp progress value', () => {
		fixture.componentRef.setInput('value', 150);
		component.ngOnInit();
		expect(component.getProgressValue()).toBe(100);
	});
});
