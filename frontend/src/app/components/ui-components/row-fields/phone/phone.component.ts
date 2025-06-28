import { Component, Injectable, Input, OnInit, AfterViewInit } from '@angular/core';
import { NgxMatInputTelComponent } from 'ngx-mat-input-tel';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';

@Injectable()

@Component({
  selector: 'app-row-phone',
  templateUrl: './phone.component.html',
  styleUrls: ['./phone.component.css'],
  imports: [MatFormFieldModule, FormsModule, NgxMatInputTelComponent]
})
export class PhoneRowComponent extends BaseRowFieldComponent implements OnInit, AfterViewInit {
  @Input() value: string;

  static type = 'phone';

  preferredCountries: string[] = ['US', 'GB'];
  enablePlaceholder: boolean = true;
  enableAutoCountrySelect: boolean = true;
  phoneValidation: boolean = true;

  ngOnInit(): void {
    super.ngOnInit();
    this.configureFromWidgetParams();
  }

  ngAfterViewInit(): void {
    // Any additional initialization if needed
  }

  private configureFromWidgetParams(): void {
    if (this.widgetStructure && this.widgetStructure.widget_params) {
      const params = this.widgetStructure.widget_params;
      
      if (params.preferred_countries && Array.isArray(params.preferred_countries)) {
        this.preferredCountries = params.preferred_countries;
      }
      
      if (typeof params.enable_placeholder === 'boolean') {
        this.enablePlaceholder = params.enable_placeholder;
      }
      
      if (typeof params.enable_auto_country_select === 'boolean') {
        this.enableAutoCountrySelect = params.enable_auto_country_select;
      }
      
      if (typeof params.phone_validation === 'boolean') {
        this.phoneValidation = params.phone_validation;
      }
    }
  }

  onPhoneNumberChange(phoneNumber: string): void {
    this.value = phoneNumber;
    this.onFieldChange.emit(this.value);
  }
}