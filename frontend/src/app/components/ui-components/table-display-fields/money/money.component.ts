import { Component, OnInit } from '@angular/core';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { getCurrencyByCode } from 'src/app/consts/currencies';

@Component({
  selector: 'app-money-display',
  templateUrl: './money.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './money.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class MoneyDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
  public displayCurrency: string = '';
  public currencySymbol: string = '';

  ngOnInit(): void {
    // Get currency from widget params
    this.displayCurrency = '';
    if (this.widgetStructure && this.widgetStructure.widget_params && this.widgetStructure.widget_params.default_currency) {
      this.displayCurrency = this.widgetStructure.widget_params.default_currency;
      const currency = getCurrencyByCode(this.displayCurrency);
      this.currencySymbol = currency ? currency.symbol : '';
    }
  }

  get formattedValue(): string {
    if (!this.value) {
      return '';
    }

    let amount: number | string;
    let currency: string = this.displayCurrency;

    if (typeof this.value === 'object' && this.value.amount !== undefined) {
      amount = this.value.amount;
      if (this.value.currency) {
        currency = this.value.currency;
        const currencyObj = getCurrencyByCode(currency);
        this.currencySymbol = currencyObj ? currencyObj.symbol : '';
      }
    } else {
      amount = this.value;
    }

    if (typeof amount === 'string') {
      amount = parseFloat(amount);
    }

    if (isNaN(amount as number)) {
      return '';
    }

    const decimalPlaces = this.widgetStructure?.widget_params?.decimal_places ?? 2;
    return `${this.currencySymbol}${(amount as number).toFixed(decimalPlaces)}`;
  }
}
