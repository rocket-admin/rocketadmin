import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { COUNTRIES, Country, getCountryFlag } from '../../../../consts/countries';
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

interface CountryWithFlag extends Country {
	flag: string;
}

@Component({
	selector: 'app-filter-phone',
	templateUrl: './phone.component.html',
	styleUrls: ['./phone.component.css'],
	imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatAutocompleteModule, MatInputModule],
})
export class PhoneFilterComponent extends BaseFilterFieldComponent implements OnInit {
	@Input() value: string;

	public countries: CountryWithFlag[] = [];
	public countryControl = new FormControl<CountryWithFlag | string>('');
	public filteredCountries: Observable<CountryWithFlag[]>;

	getCountryFlag = getCountryFlag;

	ngOnInit(): void {
		super.ngOnInit();
		this.loadCountries();
		this.setupAutocomplete();
		this.setInitialValue();
		this.onComparatorChange.emit('startswith');
	}

	private setupAutocomplete(): void {
		this.filteredCountries = this.countryControl.valueChanges.pipe(
			startWith(''),
			map((value) => this._filter(typeof value === 'string' ? value : value?.name || '')),
		);
	}

	private setInitialValue(): void {
		if (this.value) {
			const country = this.countries.find((c) => c.dialCode === this.value);
			if (country) {
				this.countryControl.setValue(country);
			}
		}
	}

	private _filter(value: string): CountryWithFlag[] {
		const filterValue = value.toLowerCase();
		return this.countries.filter(
			(country) =>
				country.name.toLowerCase().includes(filterValue) ||
				country.code.toLowerCase().includes(filterValue) ||
				country.dialCode?.includes(filterValue),
		);
	}

	onCountrySelected(selectedCountry: CountryWithFlag): void {
		this.value = selectedCountry.dialCode;
		this.onFieldChange.emit(this.value);
		this.onComparatorChange.emit('startswith');
	}

	displayFn(country: CountryWithFlag): string {
		return country ? `${country.flag} ${country.name} (${country.dialCode})` : '';
	}

	private loadCountries(): void {
		this.countries = COUNTRIES.filter((country) => country.dialCode).map((country) => ({
			...country,
			flag: getCountryFlag(country.code),
		}));
	}
}
