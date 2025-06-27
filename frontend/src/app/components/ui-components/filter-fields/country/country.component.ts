import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { COUNTRIES } from '../../../../consts/countries';

@Component({
  selector: 'app-filter-country',
  templateUrl: './country.component.html',
  styleUrls: ['./country.component.css'],
  imports: [CommonModule, FormsModule, MatSelectModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CountryFilterComponent extends BaseFilterFieldComponent {
  @Input() value: string;

  public countries: {value: string | null, label: string}[] = [];

  originalOrder = () => { return 0; }

  ngOnInit(): void {
    super.ngOnInit();
    this.loadCountries();
  }

  private loadCountries(): void {
    this.countries = COUNTRIES.map(country => ({
      value: country.name,
      label: country.name
    }));

    if (this.widgetStructure?.widget_params?.allow_null || this.structure?.allow_null) {
      this.countries = [{ value: null, label: '' }, ...this.countries];
    }
  }
}