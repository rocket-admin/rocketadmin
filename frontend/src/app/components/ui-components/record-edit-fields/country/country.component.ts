import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, computed, Input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { COUNTRIES, getCountryFlag } from '../../../../consts/countries';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

interface CountryOption {
	value: string | null;
	label: string;
	flag: string;
}

@Component({
	selector: 'app-edit-country',
	imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatAutocompleteModule, MatInputModule],
	templateUrl: './country.component.html',
	styleUrls: ['./country.component.css'],
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CountryEditComponent extends BaseEditFieldComponent {
	@Input() value: string;

	public countries: CountryOption[] = [];
	public countryControl = new FormControl<CountryOption | string>('');
	public selectedCountryFlag = computed(() => {
		const value = this._controlValue();
		if (typeof value === 'object' && value !== null) {
			return value.flag;
		}
		return '';
	});

	public showFlag = computed(() => {
		if (this.widgetStructure?.widget_params) {
			try {
				const params =
					typeof this.widgetStructure.widget_params === 'string'
						? JSON.parse(this.widgetStructure.widget_params)
						: this.widgetStructure.widget_params;

				if (params.show_flag !== undefined) {
					return params.show_flag;
				}
			} catch (e) {
				console.error('Error parsing country widget params:', e);
			}
		}
		return true;
	});

	private _controlValue = toSignal(this.countryControl.valueChanges, { initialValue: '' as CountryOption | string });

	public filteredCountries = computed(() => {
		const value = this._controlValue();
		return this._filter(typeof value === 'string' ? value : value?.label || '');
	});

	originalOrder = () => {
		return 0;
	};

	getCountryFlag = getCountryFlag;

	ngOnInit(): void {
		super.ngOnInit();
		this.loadCountries();
		this.setInitialValue();
	}

	onCountrySelected(selectedCountry: CountryOption): void {
		this.value = selectedCountry.value;
		this.onFieldChange.emit(this.value);
	}

	displayFn(country: CountryOption | string): string {
		if (!country) return '';
		return typeof country === 'string' ? country : country.label;
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

	private loadCountries(): void {
		this.countries = COUNTRIES.map((country) => ({
			value: country.code,
			label: country.name,
			flag: getCountryFlag(country.code),
		})).toSorted((a, b) => a.label.localeCompare(b.label));

		if (this.widgetStructure?.widget_params?.allow_null || this.structure?.allow_null) {
			this.countries = [{ value: null, label: '', flag: '' }, ...this.countries];
		}
	}
}
