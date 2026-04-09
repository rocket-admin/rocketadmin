import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SelectFilterComponent } from './select.component';

describe('SelectFilterComponent', () => {
	let component: SelectFilterComponent;
	let fixture: ComponentFixture<SelectFilterComponent>;

	const baseStructure = {
		column_name: 'status',
		column_default: null,
		data_type: 'enum',
		data_type_params: ['active', 'pending', 'archived'],
		isExcluded: false,
		isSearched: false,
		auto_increment: false,
		allow_null: false,
		character_maximum_length: null,
	};

	const nullableStructure = {
		...baseStructure,
		allow_null: true,
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [SelectFilterComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(SelectFilterComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should populate options from structure.data_type_params', () => {
		fixture.componentRef.setInput('structure', baseStructure);
		component.ngOnInit();

		expect(component.options).toEqual([
			{ value: 'active', label: 'active' },
			{ value: 'pending', label: 'pending' },
			{ value: 'archived', label: 'archived' },
		]);
	});

	it('should prepend null option when allow_null is true', () => {
		fixture.componentRef.setInput('structure', nullableStructure);
		component.ngOnInit();

		expect(component.options[0]).toEqual({ value: null, label: '' });
	});

	it('should start with empty selectedValues when no value is provided', () => {
		fixture.componentRef.setInput('structure', baseStructure);
		component.ngOnInit();

		expect(component.selectedValues).toEqual([]);
	});

	it('should restore selectedValues from a scalar value', () => {
		component.value = 'active';
		fixture.componentRef.setInput('structure', baseStructure);
		component.ngOnInit();

		expect(component.selectedValues).toEqual(['active']);
	});

	it('should restore selectedValues from a null value', () => {
		component.value = null;
		fixture.componentRef.setInput('structure', nullableStructure);
		component.ngOnInit();

		expect(component.selectedValues).toEqual([null]);
	});

	it('should restore selectedValues from an array value', () => {
		component.value = ['active', 'pending'];
		fixture.componentRef.setInput('structure', baseStructure);
		component.ngOnInit();

		expect(component.selectedValues).toEqual(['active', 'pending']);
	});

	it('should emit initial eq comparator after view init', () => {
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.componentRef.setInput('structure', baseStructure);
		fixture.detectChanges();

		expect(component.onComparatorChange.emit).toHaveBeenCalledWith('eq');
	});

	it('should emit in comparator with array when more than one value is selected', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.componentRef.setInput('structure', baseStructure);
		component.ngOnInit();

		component.onSelectionChange(['active', 'pending']);

		expect(component.onFieldChange.emit).toHaveBeenCalledWith(['active', 'pending']);
		expect(component.onComparatorChange.emit).toHaveBeenCalledWith('in');
	});

	it('should emit eq comparator with scalar when exactly one value is selected', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.componentRef.setInput('structure', baseStructure);
		component.ngOnInit();

		component.onSelectionChange(['active']);

		expect(component.onFieldChange.emit).toHaveBeenCalledWith('active');
		expect(component.onComparatorChange.emit).toHaveBeenCalledWith('eq');
	});

	it('should emit eq comparator with null when null is the only selected value', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.componentRef.setInput('structure', nullableStructure);
		component.ngOnInit();

		component.onSelectionChange([null]);

		expect(component.onFieldChange.emit).toHaveBeenCalledWith(null);
		expect(component.onComparatorChange.emit).toHaveBeenCalledWith('eq');
	});

	it('should emit undefined when selection is cleared', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		fixture.componentRef.setInput('structure', baseStructure);
		component.ngOnInit();

		component.onSelectionChange([]);

		expect(component.onFieldChange.emit).toHaveBeenCalledWith(undefined);
	});
});
