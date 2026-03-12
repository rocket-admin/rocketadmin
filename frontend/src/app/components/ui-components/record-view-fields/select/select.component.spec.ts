import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectRecordViewComponent } from './select.component';

describe('SelectRecordViewComponent', () => {
	let component: SelectRecordViewComponent;
	let fixture: ComponentFixture<SelectRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [SelectRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(SelectRecordViewComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display dash for null value', () => {
		fixture.componentRef.setInput('value', null);
		component.ngOnInit();
		expect(component.displayValue).toBe('—');
	});

	it('should display option label when matching widget option', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: {
				options: [{ value: 'a', label: 'Alpha' }],
			},
		});
		fixture.componentRef.setInput('value', 'a');
		component.ngOnInit();
		expect(component.displayValue).toBe('Alpha');
	});

	it('should display raw value when no matching option', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: {
				options: [{ value: 'b', label: 'Beta' }],
			},
		});
		fixture.componentRef.setInput('value', 'unknown');
		component.ngOnInit();
		expect(component.displayValue).toBe('unknown');
	});

	it('should set backgroundColor from matching option', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: {
				options: [{ value: 'a', label: 'Alpha', background_color: '#ff0000' }],
			},
		});
		fixture.componentRef.setInput('value', 'a');
		component.ngOnInit();
		expect(component.backgroundColor).toBe('#ff0000');
	});
});
