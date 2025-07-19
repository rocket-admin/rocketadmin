import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { parsePhoneNumber } from 'libphonenumber-js';
import { COUNTRIES, getCountryFlag } from '../../../../consts/countries';

@Component({
  selector: 'app-phone-display',
  templateUrl: './phone.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './phone.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class PhoneDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
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
