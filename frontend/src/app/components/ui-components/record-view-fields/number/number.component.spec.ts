import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NumberRecordViewComponent } from './number.component';

describe('NumberRecordViewComponent', () => {
	let component: NumberRecordViewComponent;
	let fixture: ComponentFixture<NumberRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [NumberRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(NumberRecordViewComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should display em dash for null value', () => {
		component.value = null;
		expect(component.displayValue).toBe('—');
	});

	it('should display number as string when no unit', () => {
		component.value = 42;
		expect(component.displayValue).toBe('42');
	});

	it('should return false for isOutOfThreshold when no thresholds', () => {
		component.value = '50';
		component.widgetStructure = { widget_params: {} } as any;
		expect(component.isOutOfThreshold).toBe(false);
	});

	it('should return down when value below threshold_min', () => {
		component.value = '5';
		component.widgetStructure = { widget_params: { threshold_min: 10 } } as any;
		expect(component.isOutOfThreshold).toBe('down');
	});

	it('should return up when value above threshold_max', () => {
		component.value = '150';
		component.widgetStructure = { widget_params: { threshold_max: 100 } } as any;
		expect(component.isOutOfThreshold).toBe('up');
	});
});
