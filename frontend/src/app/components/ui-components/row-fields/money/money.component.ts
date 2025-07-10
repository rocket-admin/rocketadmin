import { Component, Input, OnInit } from '@angular/core';
import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';

interface Money {
  code: string;
  name: string;
  symbol: string;
  flag?: string;
}

interface MoneyValue {
  amount: number | string;
  currency: string;
}

@Component({
  selector: 'app-row-money',
  templateUrl: './money.component.html',
  styleUrls: ['./money.component.css'],
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatSelectModule, FormsModule]
})
export class MoneyRowComponent extends BaseRowFieldComponent implements OnInit {
  @Input() value: string | number | MoneyValue = '';

  static type = 'money';

  defaultCurrency: string = 'USD';
  showCurrencySelector: boolean = false;
  decimalPlaces: number = 2;
  allowNegative: boolean = true;

  selectedCurrency: string = 'USD';
  amount: number | string = '';
  displayAmount: string = '';

  currencies: Money[] = [
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱' },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿' },
    { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦' },
    { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱' },
    { code: 'EGP', name: 'Egyptian Pound', symbol: '£', flag: '🇪🇬' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
    { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', flag: '🇺🇦' }
  ];

  ngOnInit(): void {
    super.ngOnInit();
    this.configureFromWidgetParams();
    this.initializeMoneyValue();
  }

  configureFromWidgetParams(): void {
    if (this.widgetStructure && this.widgetStructure.widget_params) {
      const params = this.widgetStructure.widget_params;
      
      if (typeof params.default_currency === 'string') {
        this.defaultCurrency = params.default_currency;
      }
      
      if (typeof params.show_currency_selector === 'boolean') {
        this.showCurrencySelector = params.show_currency_selector;
      }
      
      if (typeof params.decimal_places === 'number') {
        this.decimalPlaces = Math.max(0, Math.min(10, params.decimal_places));
      }
      
      if (typeof params.allow_negative === 'boolean') {
        this.allowNegative = params.allow_negative;
      }
    }
  }

  private initializeMoneyValue(): void {
    if (this.value) {
      if (typeof this.value === 'string') {
        this.parseStringValue(this.value);
      } else if (typeof this.value === 'object' && this.value.amount !== undefined && this.value.currency) {
        this.amount = this.value.amount;
        this.selectedCurrency = this.value.currency;
        this.displayAmount = this.formatAmount(this.amount);
      } else if (typeof this.value === 'number') {
        // Handle numeric values when currency selector is disabled
        this.amount = this.value;
        this.selectedCurrency = this.defaultCurrency;
        this.displayAmount = this.formatAmount(this.amount);
      }
    } else {
      this.selectedCurrency = this.defaultCurrency;
      this.amount = '';
      this.displayAmount = '';
    }
  }

  private parseStringValue(stringValue: string): void {
    // Try to parse formats like "100.50 USD", "USD 100.50", "$100.50", "€100,50"
    const currencyMatch = stringValue.match(/([A-Z]{3})/);
    const numberMatch = stringValue.match(/([\d,.-]+)/);
    
    if (currencyMatch) {
      this.selectedCurrency = currencyMatch[1];
    } else {
      // Try to detect currency by symbol
      const currency = this.currencies.find(c => stringValue.includes(c.symbol));
      if (currency) {
        this.selectedCurrency = currency.code;
      } else {
        this.selectedCurrency = this.defaultCurrency;
      }
    }
    
    if (numberMatch) {
      const cleanNumber = numberMatch[1].replace(/,/g, '');
      this.amount = parseFloat(cleanNumber) || '';
      this.displayAmount = this.formatAmount(this.amount);
    } else {
      this.amount = '';
      this.displayAmount = '';
    }
  }

  onCurrencyChange(): void {
    this.updateValue();
  }

  onAmountChange(): void {
    // Clean and validate the input
    let cleanValue = this.displayAmount.replace(/[^\d.-]/g, '');
    
    // Handle negative values
    if (!this.allowNegative) {
      cleanValue = cleanValue.replace(/-/g, '');
    }
    
    // Parse the number
    const numericValue = parseFloat(cleanValue);
    
    if (!isNaN(numericValue)) {
      this.amount = numericValue;
      // Don't reformat while user is typing to preserve focus
      if (this.displayAmount !== cleanValue) {
        this.displayAmount = cleanValue;
      }
    } else if (cleanValue === '' || cleanValue === '-') {
      this.amount = '';
      this.displayAmount = cleanValue;
    } else {
      // Invalid input, revert to previous value
      this.displayAmount = this.formatAmount(this.amount);
    }
    
    this.updateValue();
  }

  onAmountBlur(): void {
    // Format the amount when user leaves the field
    if (this.amount !== '' && this.amount !== null && this.amount !== undefined) {
      this.displayAmount = this.formatAmount(this.amount);
    }
  }

  private formatAmount(amount: number | string): string {
    if (amount === '' || amount === null || amount === undefined) {
      return '';
    }
    
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numericAmount)) {
      return '';
    }
    
    return numericAmount.toFixed(this.decimalPlaces);
  }

  private updateValue(): void {
    if (this.amount === '' || this.amount === null || this.amount === undefined) {
      this.value = '';
    } else {
      if (this.showCurrencySelector) {
        // Store as object with amount and currency when selector is enabled
        this.value = {
          amount: this.amount,
          currency: this.selectedCurrency
        };
      } else {
        // Store only the numeric amount when currency selector is disabled
        this.value = typeof this.amount === 'string' ? parseFloat(this.amount) || 0 : this.amount;
      }
    }
    
    this.onFieldChange.emit(this.value);
  }

  get selectedCurrencyData(): Money {
    return this.currencies.find(c => c.code === this.selectedCurrency) || this.currencies[0];
  }

  get placeholder(): string {
    const currency = this.selectedCurrencyData;
    return `Enter amount in ${currency.name}`;
  }

  get displayValue(): string {
    if (!this.amount && this.amount !== 0) {
      return '';
    }
    
    const currency = this.selectedCurrencyData;
    const formattedAmount = this.formatAmount(this.amount);
    
    return `${currency.symbol}${formattedAmount}`;
  }

  displayCurrencyFn(currency: Money): string {
    return currency ? `${currency.flag || ''} ${currency.code} - ${currency.name}` : '';
  }
}