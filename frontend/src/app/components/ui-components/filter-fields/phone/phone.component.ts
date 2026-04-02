import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, OnInit } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { COUNTRIES, Country, getCountryFlag } from '../../../../consts/countries';
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

interface CountryWithFlag extends Country {
	flag: string;
}

const COUNTRIES_WITH_FLAGS: CountryWithFlag[] = COUNTRIES.filter((country) => country.dialCode).map((country) => ({
	...country,
	flag: getCountryFlag(country.code),
}));

@Component({
	selector: 'app-filter-phone',
	templateUrl: './phone.component.html',
	styleUrls: ['./phone.component.css'],
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		MatFormFieldModule,
		MatAutocompleteModule,
		MatInputModule,
		MatSelectModule,
	],
})
export class PhoneFilterComponent extends BaseFilterFieldComponent implements OnInit, AfterViewInit {
	@Input() value: string;

	public filterMode: string = 'eq';
	public countries: CountryWithFlag[] = COUNTRIES_WITH_FLAGS;
	public countryControl = new FormControl<CountryWithFlag | string>('');
	public filteredCountries: Observable<CountryWithFlag[]>;

	getCountryFlag = getCountryFlag;

	ngOnInit(): void {
		super.ngOnInit();
		this.setupAutocomplete();

		if (this.value) {
			const country = this.countries.find((c) => c.dialCode === this.value);
			if (country) {
				this.filterMode = 'country';
				this.countryControl.setValue(country);
			}
		}
	}

	ngAfterViewInit(): void {
		if (this.filterMode !== 'eq') {
			this.onComparatorChange.emit(this.filterMode === 'country' ? 'startswith' : this.filterMode);
		}
	}

	onFilterModeChange(mode: string): void {
		this.filterMode = mode;

		if (mode === 'country') {
			const selected = this.countryControl.value;
			this.value = typeof selected === 'object' && selected ? selected.dialCode : '';
			this.onComparatorChange.emit('startswith');
		} else if (mode === 'empty') {
			this.value = '';
			this.onComparatorChange.emit('empty');
		} else {
			this.onComparatorChange.emit(mode);
		}

		this.onFieldChange.emit(this.value);
	}

	onCountrySelected(selectedCountry: CountryWithFlag): void {
		this.value = selectedCountry.dialCode;
		this.onFieldChange.emit(this.value);
		this.onComparatorChange.emit('startswith');
	}

	onValueChange(text: string): void {
		this.value = text;
		this.onFieldChange.emit(this.value);
		this.onComparatorChange.emit(this.filterMode);
	}

	displayFn(country: CountryWithFlag): string {
		return country ? `${country.flag} ${country.name} (${country.dialCode})` : '';
	}

	private setupAutocomplete(): void {
		this.filteredCountries = this.countryControl.valueChanges.pipe(
			startWith(''),
			map((value) => this._filter(typeof value === 'string' ? value : value?.name || '')),
		);
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
}
