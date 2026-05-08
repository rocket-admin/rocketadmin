import { ClipboardModule } from '@angular/cdk/clipboard';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { getCurrencyByCode, getCurrencyDecimalPlaces, getCurrencyMinorUnitFactor } from 'src/app/consts/currencies';
import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';

@Component({
	selector: 'app-money-display',
	templateUrl: './money.component.html',
	styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './money.component.css'],
	imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule],
})
export class MoneyDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
	public displayCurrency: string = '';
	public currencySymbol: string = '';

	ngOnInit(): void {
		// Get currency from widget params
		this.displayCurrency = '';
		if (this.widgetStructure()?.widget_params?.default_currency) {
			this.displayCurrency = this.widgetStructure().widget_params.default_currency;
			const currency = getCurrencyByCode(this.displayCurrency);
			this.currencySymbol = currency ? currency.symbol : '';
		}
	}

	get formattedValue(): string {
		const raw = this.value();
		if (raw == null || raw === '') {
			return '';
		}

		let amount: number | string;
		let currency: string = this.displayCurrency;

		if (typeof raw === 'object' && raw.amount !== undefined) {
			amount = raw.amount;
			if (raw.currency) {
				currency = raw.currency;
				const currencyObj = getCurrencyByCode(currency);
				this.currencySymbol = currencyObj ? currencyObj.symbol : '';
			}
		} else {
			amount = raw;
		}

		if (typeof amount === 'string') {
			amount = parseFloat(amount);
		}

		if (Number.isNaN(amount as number)) {
			return '';
		}

		const cents = this.widgetStructure()?.widget_params?.cents === true;
		let decimalPlaces: number;
		if (cents) {
			amount = (amount as number) / getCurrencyMinorUnitFactor(currency);
			decimalPlaces = getCurrencyDecimalPlaces(currency);
		} else {
			decimalPlaces = this.widgetStructure()?.widget_params?.decimal_places ?? 2;
		}

		return `${this.currencySymbol}${(amount as number).toFixed(decimalPlaces)}`;
	}
}
