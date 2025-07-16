import { Component, OnInit } from '@angular/core';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';

interface MoneyValue {
  amount: number | string;
  currency: string;
}

@Component({
  selector: 'app-money-display',
  templateUrl: './money.component.html',
  styleUrls: ['./money.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class MoneyDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
  static type = 'money';

  public displayAmount: string = '';
  public displayCurrency: string = '';

  override ngOnInit(): void {
    super.ngOnInit();

    if (this.value) {
      if (typeof this.value === 'object' && 'amount' in this.value && 'currency' in this.value) {
        // Handle MoneyValue object format
        const moneyValue = this.value as MoneyValue;
        this.displayAmount = String(moneyValue.amount);
        this.displayCurrency = moneyValue.currency;
      } else if (typeof this.value === 'number') {
        // Handle number format
        this.displayAmount = String(this.value);
        this.displayCurrency = 'USD'; // Default currency
      } else if (typeof this.value === 'string') {
        // Try to parse as JSON
        try {
          const parsedValue = JSON.parse(this.value);
          if (parsedValue && typeof parsedValue === 'object') {
            this.displayAmount = String(parsedValue.amount || '');
            this.displayCurrency = parsedValue.currency || '';
          } else {
            this.displayAmount = this.value;
          }
        } catch {
          // If not valid JSON, just display as is
          this.displayAmount = this.value;
        }
      }
    }
  }
}
