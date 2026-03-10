import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CountryEditComponent } from './country.component';

describe('CountryEditComponent', () => {
	let component: CountryEditComponent;
	let fixture: ComponentFixture<CountryEditComponent>;

	const fakeStructure = {
		column_name: 'country',
		column_default: null,
		data_type: 'varchar',
		isExcluded: false,
		isSearched: false,
		auto_increment: false,
		allow_null: false,
		character_maximum_length: 2,
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CountryEditComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CountryEditComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should load countries on init', () => {
		fixture.componentRef.setInput('structure', fakeStructure as any);
		component.ngOnInit();
		expect(component.countries.length).toBeGreaterThan(0);
	});

	it('should sort countries alphabetically', () => {
		fixture.componentRef.setInput('structure', fakeStructure as any);
		component.ngOnInit();
		const labels = component.countries.map((c) => c.label);
		const sorted = [...labels].sort((a, b) => a.localeCompare(b));
		expect(labels).toEqual(sorted);
	});

	it('should prepend null option when allow_null is true', () => {
		fixture.componentRef.setInput('structure', { ...fakeStructure, allow_null: true } as any);
		component.ngOnInit();
		expect(component.countries[0].value).toBeNull();
		expect(component.countries[0].label).toBe('');
	});

	it('should not prepend null option when allow_null is false', () => {
		fixture.componentRef.setInput('structure', fakeStructure as any);
		component.ngOnInit();
		expect(component.countries[0].value).not.toBeNull();
	});

	it('should set initial value when value matches a country code', () => {
		fixture.componentRef.setInput('value', 'US');
		fixture.componentRef.setInput('structure', fakeStructure as any);
		component.ngOnInit();
		const controlValue = component.countryControl.value;
		expect(controlValue).toBeTruthy();
		expect(typeof controlValue).toBe('object');
		expect((controlValue as any).value).toBe('US');
	});

	it('should not set control value when value does not match any country', () => {
		fixture.componentRef.setInput('value', 'XX');
		fixture.componentRef.setInput('structure', fakeStructure as any);
		component.ngOnInit();
		const controlValue = component.countryControl.value;
		expect(controlValue).toBe('');
	});

	it('should emit onFieldChange when a country is selected', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		const country = { value: 'FR', label: 'France', flag: '🇫🇷' };
		component.onCountrySelected(country);
		expect(component.value()).toBe('FR');
		expect(component.onFieldChange.emit).toHaveBeenCalledWith('FR');
	});

	it('should display label for country object in displayFn', () => {
		const result = component.displayFn({ value: 'US', label: 'United States', flag: '🇺🇸' });
		expect(result).toBe('United States');
	});

	it('should return string as-is in displayFn', () => {
		const result = component.displayFn('some text');
		expect(result).toBe('some text');
	});

	it('should return empty string for falsy input in displayFn', () => {
		const result = component.displayFn(null);
		expect(result).toBe('');
	});

	it('should filter countries by label', () => {
		fixture.componentRef.setInput('structure', fakeStructure as any);
		component.ngOnInit();
		component.countryControl.setValue('united');
		const filtered = component.filteredCountries();
		expect(filtered.length).toBeGreaterThan(0);
		filtered.forEach((c) => {
			expect(c.label.toLowerCase() + c.value?.toLowerCase()).toContain('united');
		});
	});
});
