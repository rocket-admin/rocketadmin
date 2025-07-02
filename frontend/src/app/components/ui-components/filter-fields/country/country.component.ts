import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { COUNTRIES, getCountryFlag } from '../../../../consts/countries';
import { map, startWith } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { FormControl } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-filter-country',
  templateUrl: './country.component.html',
  styleUrls: ['./country.component.css'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatAutocompleteModule, MatInputModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CountryFilterComponent extends BaseFilterFieldComponent {
  @Input() value: string;

  public countries: {value: string | null, label: string, flag: string}[] = [];
  public countryControl = new FormControl('');
  public filteredCountries: Observable<{value: string | null, label: string, flag: string}[]>;

  originalOrder = () => { return 0; }

  getCountryFlag = getCountryFlag;

  ngOnInit(): void {
    super.ngOnInit();
    this.loadCountries();
    this.setupAutocomplete();
    this.setInitialValue();
  }

  private setupAutocomplete(): void {
    this.filteredCountries = this.countryControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || ''))
    );
  }

  private setInitialValue(): void {
    if (this.value) {
      const country = this.countries.find(c => c.value === this.value);
      if (country) {
        this.countryControl.setValue(country.label);
      }
    }
  }

  private _filter(value: string): {value: string | null, label: string, flag: string}[] {
    const filterValue = value.toLowerCase();
    return this.countries.filter(country => 
      country.label?.toLowerCase().includes(filterValue) ||
      (country.value && country.value.toLowerCase().includes(filterValue))
    );
  }

  onCountrySelected(selectedCountry: {value: string | null, label: string, flag: string}): void {
    this.value = selectedCountry.value;
    this.onFieldChange.emit(this.value);
  }

  displayFn(country: any): string {
    return country ? country.label : '';
  }

  private loadCountries(): void {
    this.countries = COUNTRIES.map(country => ({
      value: country.code,
      label: country.name,
      flag: getCountryFlag(country.code)
    }));

    if (this.widgetStructure?.widget_params?.allow_null || this.structure?.allow_null) {
      this.countries = [{ value: null, label: '', flag: '' }, ...this.countries];
    }
  }
}