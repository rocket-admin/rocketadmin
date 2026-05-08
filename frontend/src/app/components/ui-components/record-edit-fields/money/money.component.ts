import { CommonModule } from '@angular/common';
import { Component, model, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
	CURRENCIES,
	getCurrencyDecimalPlaces,
	getCurrencyMinorUnitFactor,
	Money,
	MoneyValue,
} from 'src/app/consts/currencies';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-money',
	templateUrl: './money.component.html',
	styleUrls: ['./money.component.css'],
	imports: [CommonModule, MatFormFieldModule, MatInputModule, MatSelectModule, FormsModule],
})
export class MoneyEditComponent extends BaseEditFieldComponent implements OnInit {
	readonly value = model<string | number | MoneyValue>('');

	static type = 'money';

	defaultCurrency: string = 'USD';
	showCurrencySelector: boolean = false;
	decimalPlaces: number = 2;
	allowNegative: boolean = true;
	cents: boolean = false;

	selectedCurrency: string = 'USD';
	amount: number | string = '';
	displayAmount: string = '';

	currencies: Money[] = CURRENCIES;

	ngOnInit(): void {
		super.ngOnInit();
		this.configureFromWidgetParams();
		this.initializeMoneyValue();
	}

	configureFromWidgetParams(): void {
		const ws = this.widgetStructure();
		if (ws?.widget_params) {
			const params = ws.widget_params;

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

			if (params.cents === true) {
				this.cents = true;
			}
		}

		this._applyCurrencyDecimalPlaces();
	}

	private initializeMoneyValue(): void {
		const currentValue = this.value();
		if (currentValue !== '' && currentValue !== null && currentValue !== undefined) {
			if (typeof currentValue === 'string') {
				this.parseStringValue(currentValue);
			} else if (
				typeof currentValue === 'object' &&
				(currentValue as MoneyValue).amount !== undefined &&
				(currentValue as MoneyValue).currency
			) {
				this.selectedCurrency = (currentValue as MoneyValue).currency;
				this._applyCurrencyDecimalPlaces();
				this.amount = this._fromMinorUnits((currentValue as MoneyValue).amount);
				this.displayAmount = this.formatAmount(this.amount);
			} else if (typeof currentValue === 'number') {
				// Handle numeric values when currency selector is disabled
				this.selectedCurrency = this.defaultCurrency;
				this._applyCurrencyDecimalPlaces();
				this.amount = this._fromMinorUnits(currentValue);
				this.displayAmount = this.formatAmount(this.amount);
			}
		} else {
			this.selectedCurrency = this.defaultCurrency;
			this._applyCurrencyDecimalPlaces();
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
			const currency = this.currencies.find((c) => stringValue.includes(c.symbol));
			if (currency) {
				this.selectedCurrency = currency.code;
			} else {
				this.selectedCurrency = this.defaultCurrency;
			}
		}

		this._applyCurrencyDecimalPlaces();

		if (numberMatch) {
			const cleanNumber = numberMatch[1].replace(/,/g, '');
			const parsed = parseFloat(cleanNumber);
			this.amount = Number.isNaN(parsed) ? '' : this._fromMinorUnits(parsed);
			this.displayAmount = this.formatAmount(this.amount);
		} else {
			this.amount = '';
			this.displayAmount = '';
		}
	}

	onCurrencyChange(): void {
		if (this.cents) {
			this._applyCurrencyDecimalPlaces();
			if (this.amount !== '' && this.amount !== null && this.amount !== undefined) {
				const numericAmount = typeof this.amount === 'string' ? parseFloat(this.amount) : this.amount;
				if (!Number.isNaN(numericAmount)) {
					const rounded = parseFloat(numericAmount.toFixed(this.decimalPlaces));
					this.amount = rounded;
					this.displayAmount = this.formatAmount(rounded);
				}
			}
		}
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

		if (!Number.isNaN(numericValue)) {
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

	public formatAmount(amount: number | string): string {
		if (amount === '' || amount === null || amount === undefined) {
			return '';
		}

		const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

		if (Number.isNaN(numericAmount)) {
			return '';
		}

		return numericAmount.toFixed(this.decimalPlaces);
	}

	public updateValue(): void {
		if (this.amount === '' || this.amount === null || this.amount === undefined) {
			this.value.set('');
		} else {
			const storedAmount = this._toMinorUnits();
			if (this.showCurrencySelector) {
				// Store as object with amount and currency when selector is enabled
				this.value.set({
					amount: storedAmount,
					currency: this.selectedCurrency,
				});
			} else {
				// Store only the numeric amount when currency selector is disabled
				this.value.set(storedAmount);
			}
		}

		this.onFieldChange.emit(this.value());
	}

	get selectedCurrencyData(): Money {
		return this.currencies.find((c) => c.code === this.selectedCurrency) || this.currencies[0];
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

	private _applyCurrencyDecimalPlaces(): void {
		if (this.cents) {
			this.decimalPlaces = getCurrencyDecimalPlaces(this.selectedCurrency);
		}
	}

	private _fromMinorUnits(stored: number | string): number | string {
		if (!this.cents) {
			return stored;
		}
		const numeric = typeof stored === 'string' ? parseFloat(stored) : stored;
		if (Number.isNaN(numeric)) {
			return '';
		}
		return numeric / getCurrencyMinorUnitFactor(this.selectedCurrency);
	}

	private _toMinorUnits(): number {
		const sourceText =
			this.displayAmount !== '' && this.displayAmount !== null && this.displayAmount !== undefined
				? String(this.displayAmount).replace(/[^\d.-]/g, '')
				: typeof this.amount === 'string'
					? this.amount
					: String(this.amount);
		const numeric = parseFloat(sourceText);
		if (Number.isNaN(numeric)) {
			return 0;
		}
		if (!this.cents) {
			return numeric;
		}
		return Math.round(numeric * getCurrencyMinorUnitFactor(this.selectedCurrency));
	}
}
