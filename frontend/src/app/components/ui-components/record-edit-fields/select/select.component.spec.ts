import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SelectEditComponent } from './select.component';

describe('SelectEditComponent', () => {
	let component: SelectEditComponent;
	let fixture: ComponentFixture<SelectEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [SelectEditComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(SelectEditComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should have empty options by default', () => {
		expect(component.options).toEqual([]);
	});

	it('should load options from widgetStructure widget_params', () => {
		const options = [
			{ value: 'opt1', label: 'Option 1' },
			{ value: 'opt2', label: 'Option 2' },
		];
		component.widgetStructure = { widget_params: { options } } as any;
		component.ngOnInit();
		expect(component.options).toEqual(options);
	});

	it('should prepend null option when widgetStructure allow_null is true', () => {
		const options = [{ value: 'opt1', label: 'Option 1' }];
		component.widgetStructure = { widget_params: { options, allow_null: true } } as any;
		component.ngOnInit();
		expect(component.options[0]).toEqual({ value: null, label: '' });
		expect(component.options.length).toBe(2);
	});

	it('should not prepend null option when widgetStructure allow_null is false', () => {
		const options = [{ value: 'opt1', label: 'Option 1' }];
		component.widgetStructure = { widget_params: { options, allow_null: false } } as any;
		component.ngOnInit();
		expect(component.options.length).toBe(1);
		expect(component.options[0].value).toBe('opt1');
	});

	it('should load options from structure data_type_params when no widgetStructure', () => {
		component.structure = {
			data_type_params: ['active', 'inactive', 'pending'],
			allow_null: false,
		} as any;
		component.ngOnInit();
		expect(component.options).toEqual([
			{ value: 'active', label: 'active' },
			{ value: 'inactive', label: 'inactive' },
			{ value: 'pending', label: 'pending' },
		]);
	});

	it('should prepend null option from structure when allow_null is true', () => {
		component.structure = {
			data_type_params: ['active', 'inactive'],
			allow_null: true,
		} as any;
		component.ngOnInit();
		expect(component.options[0]).toEqual({ value: null, label: '' });
		expect(component.options.length).toBe(3);
	});

	it('should return 0 from originalOrder', () => {
		expect(component.originalOrder()).toBe(0);
	});
});
