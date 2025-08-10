import { COUNTRIES, getCountryFlag } from '../../../../consts/countries';
import { Component, Injectable, OnChanges, OnInit, SimpleChanges } from '@angular/core';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { CommonModule } from '@angular/common';

@Injectable()
@Component({
  selector: 'app-country-record-view',
  templateUrl: './country.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './country.component.css'],
  imports: [CommonModule]
})
export class CountryRecordViewComponent extends BaseRecordViewFieldComponent implements OnInit {
  static type = 'country';

  public countryName: string = '';
  public countryFlag: string = '';
  public showFlag: boolean = true;

  ngOnInit(): void {
    this.parseWidgetParams();

    if (this.value) {
      const country = COUNTRIES.find(c => c.code === this.value);
      this.countryName = country ? country.name : this.value;
      this.countryFlag = getCountryFlag(this.value);
    } else {
      this.countryName = '—';
      this.countryFlag = '';
    }
  }

  private parseWidgetParams(): void {
    if (this.widgetStructure?.widget_params) {
      try {
        const params = typeof this.widgetStructure.widget_params === 'string'
          ? JSON.parse(this.widgetStructure.widget_params)
          : this.widgetStructure.widget_params;

        if (params.show_flag !== undefined) {
          this.showFlag = params.show_flag;
        }
      } catch (e) {
        console.error('Error parsing country widget params:', e);
      }
    }
  }
}
