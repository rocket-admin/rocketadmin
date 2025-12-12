import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { Component, Injectable, OnInit } from '@angular/core';
import { parsePhoneNumber } from 'libphonenumber-js';
import { COUNTRIES, getCountryFlag } from '../../../../consts/countries';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';

@Injectable()
@Component({
  selector: 'app-phone-record-view',
  templateUrl: './phone.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './phone.component.css'],
  imports: [MatTooltipModule, CommonModule]
})
export class PhoneRecordViewComponent extends BaseRecordViewFieldComponent implements OnInit {
  public countryFlag: string = '';
  public countryName: string = '';
  public formattedNumber: string = '';

  ngOnInit(): void {
    this.parsePhoneNumber();
  }

  private parsePhoneNumber(): void {
    if (!this.value || typeof this.value !== 'string') {
      this.countryFlag = '';
      this.countryName = '';
      this.formattedNumber = '';
      return;
    }

    try {
      const phoneNumber = parsePhoneNumber(this.value);

      if (phoneNumber && phoneNumber.country) {
        const country = COUNTRIES.find(c => c.code === phoneNumber.country);

        if (country) {
          this.countryFlag = getCountryFlag(country.code);
          this.countryName = country.name;
          this.formattedNumber = phoneNumber.formatInternational();
        } else {
          this.countryFlag = '';
          this.countryName = '';
          this.formattedNumber = this.value;
        }
      } else {
        this.countryFlag = '';
        this.countryName = '';
        this.formattedNumber = this.value;
      }
    } catch (error) {
      this.countryFlag = '';
      this.countryName = '';
      this.formattedNumber = this.value;
    }
  }
}
