import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectDisplayComponent } from './select.component';

describe('SelectDisplayComponent', () => {
	let component: SelectDisplayComponent;
	let fixture: ComponentFixture<SelectDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [SelectDisplayComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(SelectDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display option label from widget params', () => {
		fixture.componentRef.setInput('value', 'opt1');
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: {
				options: [
					{ value: 'opt1', label: 'Option One' },
					{ value: 'opt2', label: 'Option Two' },
				],
			},
		});
		component.ngOnInit();
		fixture.detectChanges();
		expect(component.displayValue).toBe('Option One');
	});

	it('should display raw value when no options match', () => {
		fixture.componentRef.setInput('value', 'unknown');
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: {
				options: [{ value: 'opt1', label: 'Option One' }],
			},
		});
		component.ngOnInit();
		fixture.detectChanges();
		expect(component.displayValue).toBe('unknown');
	});

	it('should display option label when value is 0', () => {
		fixture.componentRef.setInput('value', 0);
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: {
				options: [
					{ value: 0, label: 'Zero' },
					{ value: 1, label: 'One' },
				],
			},
		});
		component.ngOnInit();
		fixture.detectChanges();
		expect(component.displayValue).toBe('Zero');
	});

	it('should display em dash when value is null', () => {
		fixture.componentRef.setInput('value', null);
		component.ngOnInit();
		fixture.detectChanges();
		expect(component.displayValue).toBe('—');
	});

	it('should display em dash when value is undefined', () => {
		fixture.componentRef.setInput('value', undefined);
		component.ngOnInit();
		fixture.detectChanges();
		expect(component.displayValue).toBe('—');
	});

	it('should display empty string value as raw, not dash', () => {
		fixture.componentRef.setInput('value', '');
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: {
				options: [{ value: 'opt1', label: 'Option One' }],
			},
		});
		component.ngOnInit();
		fixture.detectChanges();
		expect(component.displayValue).toBe('');
	});
});
