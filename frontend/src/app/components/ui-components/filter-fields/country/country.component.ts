import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { COUNTRIES, getCountryFlag } from '../../../../consts/countries';
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

interface CountryOption {
	value: string | null;
	label: string;
	flag: string;
}

const BASE_COUNTRIES: CountryOption[] = COUNTRIES.map((country) => ({
	value: country.code,
	label: country.name,
	flag: getCountryFlag(country.code),
}));

@Component({
	selector: 'app-filter-country',
	templateUrl: './country.component.html',
	styleUrls: ['./country.component.css'],
	imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatAutocompleteModule, MatInputModule],
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CountryFilterComponent extends BaseFilterFieldComponent {
	@Input() value: string;

	public countries: CountryOption[] = [];
	public countryControl = new FormControl<CountryOption | string>('');
	public filteredCountries: Observable<CountryOption[]>;

	originalOrder = () => {
		return 0;
	};

	getCountryFlag = getCountryFlag;

	ngOnInit(): void {
		const ws = this.widgetStructure();
		const struct = this.structure();
		if (ws?.widget_params?.allow_null || struct?.allow_null) {
			this.countries = [{ value: null, label: '', flag: '' }, ...BASE_COUNTRIES];
		} else {
			this.countries = BASE_COUNTRIES;
		}

		this.setupAutocomplete();
		this.setInitialValue();
	}

	onCountrySelected(selectedCountry: CountryOption): void {
		this.value = selectedCountry.value;
		this.onFieldChange.emit(this.value);
	}

	displayFn(country: any): string {
		return country ? country.label : '';
	}

	private setupAutocomplete(): void {
		this.filteredCountries = this.countryControl.valueChanges.pipe(
			startWith(''),
			map((value) => this._filter(typeof value === 'string' ? value : value?.label || '')),
		);
	}

	private setInitialValue(): void {
		if (this.value) {
			const country = this.countries.find((c) => c.value === this.value);
			if (country) {
				this.countryControl.setValue(country);
			}
		}
	}

	private _filter(value: string): CountryOption[] {
		const filterValue = value.toLowerCase();
		return this.countries.filter(
			(country) =>
				country.label?.toLowerCase().includes(filterValue) || country.value?.toLowerCase().includes(filterValue),
		);
	}
}
