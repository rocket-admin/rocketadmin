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
		component.value = null;
		component.ngOnInit();
		expect(component.displayValue).toBe('—');
	});

	it('should display option label when matching widget option', () => {
		component.widgetStructure = {
			widget_params: {
				options: [{ value: 'a', label: 'Alpha' }],
			},
		} as any;
		component.value = 'a';
		component.ngOnInit();
		expect(component.displayValue).toBe('Alpha');
	});

	it('should display raw value when no matching option', () => {
		component.widgetStructure = {
			widget_params: {
				options: [{ value: 'b', label: 'Beta' }],
			},
		} as any;
		component.value = 'unknown';
		component.ngOnInit();
		expect(component.displayValue).toBe('unknown');
	});

	it('should set backgroundColor from matching option', () => {
		component.widgetStructure = {
			widget_params: {
				options: [{ value: 'a', label: 'Alpha', background_color: '#ff0000' }],
			},
		} as any;
		component.value = 'a';
		component.ngOnInit();
		expect(component.backgroundColor).toBe('#ff0000');
	});
});
