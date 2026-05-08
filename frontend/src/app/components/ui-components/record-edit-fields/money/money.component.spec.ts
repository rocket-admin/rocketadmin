import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MoneyEditComponent } from './money.component';

describe('MoneyEditComponent', () => {
	let component: MoneyEditComponent;
	let fixture: ComponentFixture<MoneyEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				MoneyEditComponent,
				CommonModule,
				FormsModule,
				MatFormFieldModule,
				MatInputModule,
				MatSelectModule,
				BrowserAnimationsModule,
			],
		}).compileComponents();

		fixture = TestBed.createComponent(MoneyEditComponent);
		component = fixture.componentInstance;

		// Set required properties from base component
		fixture.componentRef.setInput('label', 'Test Money');
		fixture.componentRef.setInput('required', false);
		fixture.componentRef.setInput('disabled', false);
		fixture.componentRef.setInput('readonly', false);

		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should initialize with default currency USD and currency selector disabled', () => {
		expect(component.selectedCurrency).toBe('USD');
		expect(component.defaultCurrency).toBe('USD');
		expect(component.showCurrencySelector).toBe(false);
	});

	it('should parse string value correctly', () => {
		fixture.componentRef.setInput('value', '100.50 EUR');
		component.ngOnInit();
		expect(component.selectedCurrency).toBe('EUR');
		expect(component.amount).toBe(100.5);
	});

	it('should parse object value correctly', () => {
		fixture.componentRef.setInput('value', { amount: 250.75, currency: 'GBP' });
		component.ngOnInit();
		expect(component.selectedCurrency).toBe('GBP');
		expect(component.amount).toBe(250.75);
	});

	it('should parse numeric value correctly when currency selector is disabled', () => {
		fixture.componentRef.setInput('value', 150.25);
		component.ngOnInit();
		expect(component.selectedCurrency).toBe('USD');
		expect(component.amount).toBe(150.25);
		expect(component.displayAmount).toBe('150.25');
	});

	it('should handle empty value', () => {
		fixture.componentRef.setInput('value', '');
		component.ngOnInit();
		expect(component.selectedCurrency).toBe('USD');
		expect(component.amount).toBe('');
	});

	it('should format amount with correct decimal places', () => {
		component.decimalPlaces = 2;
		const formatted = component.formatAmount(123.456);
		expect(formatted).toBe('123.46');
	});

	it('should handle currency change when selector is enabled', () => {
		component.showCurrencySelector = true;
		component.selectedCurrency = 'EUR';
		component.amount = 100;
		vi.spyOn(component.onFieldChange, 'emit');

		component.onCurrencyChange();

		expect(component.onFieldChange.emit).toHaveBeenCalledWith({
			amount: 100,
			currency: 'EUR',
		});
	});

	it('should handle amount change with currency selector disabled (default)', () => {
		component.displayAmount = '123.45';
		component.selectedCurrency = 'USD';
		vi.spyOn(component.onFieldChange, 'emit');

		component.onAmountChange();

		expect(component.amount).toBe(123.45);
		expect(component.onFieldChange.emit).toHaveBeenCalledWith(123.45);
	});

	it('should handle amount change with currency selector enabled', () => {
		component.showCurrencySelector = true;
		component.displayAmount = '123.45';
		component.selectedCurrency = 'USD';
		vi.spyOn(component.onFieldChange, 'emit');

		component.onAmountChange();

		expect(component.amount).toBe(123.45);
		expect(component.onFieldChange.emit).toHaveBeenCalledWith({
			amount: 123.45,
			currency: 'USD',
		});
	});

	it('should handle invalid amount input with letters', () => {
		component.amount = 100;
		component.displayAmount = 'abc123def'; // Contains letters which get stripped

		component.onAmountChange();
		component.onAmountBlur();

		expect(component.amount).toBe(123);
		expect(component.displayAmount).toBe('123.00');
	});

	it('should handle completely invalid input', () => {
		component.amount = 100 as string | number;
		component.displayAmount = 'invalid'; // All letters, becomes empty after strip

		component.onAmountChange();

		expect(component.amount as string).toBe('');
		expect(component.displayAmount).toBe('');
	});

	it('should handle invalid amount input when amount is empty', () => {
		component.amount = '';
		component.displayAmount = 'invalid';

		component.onAmountChange();

		expect(component.displayAmount).toBe('');
	});

	it('should respect allow_negative configuration', () => {
		component.allowNegative = false;
		component.displayAmount = '-123.45';

		component.onAmountChange();

		expect(component.amount).toBe(123.45);
	});

	it('should configure from widget params', () => {
		fixture.componentRef.setInput('widgetStructure', {
			field_name: 'test_field',
			widget_type: 'Money',
			name: 'Test Widget',
			description: 'Test Description',
			widget_params: {
				default_currency: 'EUR',
				show_currency_selector: true,
				decimal_places: 3,
				allow_negative: false,
			},
		});

		component.configureFromWidgetParams();

		expect(component.defaultCurrency).toBe('EUR');
		expect(component.showCurrencySelector).toBe(true);
		expect(component.decimalPlaces).toBe(3);
		expect(component.allowNegative).toBe(false);
	});

	it('should return correct display value', () => {
		component.amount = 123.45;
		component.selectedCurrency = 'USD';

		const displayValue = component.displayValue;

		expect(displayValue).toBe('$123.45');
	});

	it('should return correct placeholder', () => {
		component.selectedCurrency = 'EUR';

		const placeholder = component.placeholder;

		expect(placeholder).toBe('Enter amount in Euro');
	});

	it('should find selected currency data', () => {
		component.selectedCurrency = 'GBP';

		const currencyData = component.selectedCurrencyData;

		expect(currencyData.code).toBe('GBP');
		expect(currencyData.name).toBe('British Pound');
		expect(currencyData.symbol).toBe('£');
	});

	it('should emit empty value when amount is cleared', () => {
		component.amount = '';
		vi.spyOn(component.onFieldChange, 'emit');

		component.updateValue();

		expect(component.onFieldChange.emit).toHaveBeenCalledWith('');
	});

	it('should load numeric value as major units when cents=true (USD)', () => {
		fixture.componentRef.setInput('widgetStructure', {
			field_name: 'price',
			widget_type: 'Money',
			name: 'Price',
			description: '',
			widget_params: { default_currency: 'USD', cents: true },
		});
		fixture.componentRef.setInput('value', 1099);
		component.ngOnInit();
		expect(component.amount).toBe(10.99);
		expect(component.displayAmount).toBe('10.99');
		expect(component.decimalPlaces).toBe(2);
	});

	it('should load JPY cents value without division and use 0 decimals', () => {
		fixture.componentRef.setInput('widgetStructure', {
			field_name: 'price',
			widget_type: 'Money',
			name: 'Price',
			description: '',
			widget_params: { default_currency: 'JPY', cents: true, show_currency_selector: true },
		});
		fixture.componentRef.setInput('value', { amount: 1099, currency: 'JPY' });
		component.ngOnInit();
		expect(component.selectedCurrency).toBe('JPY');
		expect(component.decimalPlaces).toBe(0);
		expect(component.amount).toBe(1099);
		expect(component.displayAmount).toBe('1099');
	});

	it('should emit cents integer on save when cents=true', () => {
		fixture.componentRef.setInput('widgetStructure', {
			field_name: 'price',
			widget_type: 'Money',
			name: 'Price',
			description: '',
			widget_params: { default_currency: 'USD', cents: true },
		});
		component.ngOnInit();
		component.displayAmount = '10.99';
		vi.spyOn(component.onFieldChange, 'emit');

		component.onAmountChange();

		expect(component.onFieldChange.emit).toHaveBeenCalledWith(1099);
	});

	it('should round float-precision drift on save', () => {
		fixture.componentRef.setInput('widgetStructure', {
			field_name: 'price',
			widget_type: 'Money',
			name: 'Price',
			description: '',
			widget_params: { default_currency: 'USD', cents: true },
		});
		component.ngOnInit();
		component.displayAmount = '20.99';
		vi.spyOn(component.onFieldChange, 'emit');

		component.onAmountChange();

		expect(component.onFieldChange.emit).toHaveBeenCalledWith(2099);
	});

	it('should reformat displayAmount and round on currency switch when cents=true', () => {
		fixture.componentRef.setInput('widgetStructure', {
			field_name: 'price',
			widget_type: 'Money',
			name: 'Price',
			description: '',
			widget_params: { default_currency: 'USD', cents: true, show_currency_selector: true },
		});
		fixture.componentRef.setInput('value', { amount: 1099, currency: 'USD' });
		component.ngOnInit();
		expect(component.displayAmount).toBe('10.99');

		component.selectedCurrency = 'JPY';
		vi.spyOn(component.onFieldChange, 'emit');

		component.onCurrencyChange();

		expect(component.decimalPlaces).toBe(0);
		expect(component.displayAmount).toBe('11');
		expect(component.onFieldChange.emit).toHaveBeenCalledWith({ amount: 11, currency: 'JPY' });
	});

	it('should preserve legacy behavior when cents is false or omitted', () => {
		fixture.componentRef.setInput('widgetStructure', {
			field_name: 'price',
			widget_type: 'Money',
			name: 'Price',
			description: '',
			widget_params: { default_currency: 'USD' },
		});
		fixture.componentRef.setInput('value', 10.99);
		component.ngOnInit();
		expect(component.amount).toBe(10.99);
		expect(component.displayAmount).toBe('10.99');
	});
});
