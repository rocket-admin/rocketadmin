import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NumberDisplayComponent } from './number.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('NumberDisplayComponent', () => {
	let component: NumberDisplayComponent;
	let fixture: ComponentFixture<NumberDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [NumberDisplayComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(NumberDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display value', () => {
		fixture.componentRef.setInput('value', 42);
		fixture.detectChanges();
		expect(component.displayValue).toBe('42');
	});

	it('should display dash for null', () => {
		fixture.componentRef.setInput('value', null);
		fixture.detectChanges();
		expect(component.displayValue).toBe('—');
	});

	it('should detect out-of-threshold up', () => {
		fixture.componentRef.setInput('value', 150);
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { threshold_min: 0, threshold_max: 100 },
		});
		fixture.detectChanges();
		expect(component.isOutOfThreshold).toBe('up');
	});

	it('should detect out-of-threshold down', () => {
		fixture.componentRef.setInput('value', -5);
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { threshold_min: 0, threshold_max: 100 },
		});
		fixture.detectChanges();
		expect(component.isOutOfThreshold).toBe('down');
	});
});
