import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { COUNTRIES } from '../../../../consts/countries';

@Component({
  selector: 'app-row-country',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './country.component.html',
  styleUrls: ['./country.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CountryRowComponent extends BaseRowFieldComponent {
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