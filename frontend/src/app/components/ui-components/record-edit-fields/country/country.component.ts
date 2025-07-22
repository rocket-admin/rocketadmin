import { COUNTRIES, getCountryFlag } from '../../../../consts/countries';
import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';
import { map, startWith } from 'rxjs/operators';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { CommonModule } from '@angular/common';
import { FormControl } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-country',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatAutocompleteModule, MatInputModule],
  templateUrl: './country.component.html',
  styleUrls: ['./country.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CountryEditComponent extends BaseEditFieldComponent {
  @Input() value: string;

  public countries: {value: string | null, label: string, flag: string}[] = [];
  public countryControl = new FormControl<{value: string | null, label: string, flag: string} | string>('');
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
      map(value => this._filter(typeof value === 'string' ? value : (value?.label || '')))
    );
  }

  private setInitialValue(): void {
    if (this.value) {
      const country = this.countries.find(c => c.value === this.value);
      if (country) {
        this.countryControl.setValue(country);
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