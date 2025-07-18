import { COUNTRIES, getCountryFlag } from '../../../../consts/countries';
import { Component, OnChanges, OnInit, SimpleChanges } from '@angular/core';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-country-display',
  templateUrl: './country.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './country.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class CountryDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
  static type = 'country';

  public countryName: string = '';
  public countryFlag: string = '';

  ngOnInit(): void {
    if (this.value) {
      const country = COUNTRIES.find(c => c.code === this.value);
      this.countryName = country ? country.name : this.value;
      this.countryFlag = getCountryFlag(this.value);
    } else {
      this.countryName = '—';
      this.countryFlag = '';
    }
  }
}
