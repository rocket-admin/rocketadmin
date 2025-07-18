import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
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
        BrowserAnimationsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MoneyEditComponent);
    component = fixture.componentInstance;
    
    // Set required properties from base component
    component.label = 'Test Money';
    component.required = false;
    component.disabled = false;
    component.readonly = false;
    
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
    component.value = '100.50 EUR';
    component.ngOnInit();
    expect(component.selectedCurrency).toBe('EUR');
    expect(component.amount).toBe(100.5);
  });

  it('should parse object value correctly', () => {
    component.value = { amount: 250.75, currency: 'GBP' };
    component.ngOnInit();
    expect(component.selectedCurrency).toBe('GBP');
    expect(component.amount).toBe(250.75);
  });

  it('should parse numeric value correctly when currency selector is disabled', () => {
    component.value = 150.25;
    component.ngOnInit();
    expect(component.selectedCurrency).toBe('USD');
    expect(component.amount).toBe(150.25);
    expect(component.displayAmount).toBe('150.25');
  });

  it('should handle empty value', () => {
    component.value = '';
    component.ngOnInit();
    expect(component.selectedCurrency).toBe('USD');
    expect(component.amount).toBe('');
  });

  it('should format amount with correct decimal places', () => {
    component.decimalPlaces = 2;
    const formatted = component['formatAmount'](123.456);
    expect(formatted).toBe('123.46');
  });

  it('should handle currency change when selector is enabled', () => {
    component.showCurrencySelector = true;
    component.selectedCurrency = 'EUR';
    component.amount = 100;
    spyOn(component.onFieldChange, 'emit');
    
    component.onCurrencyChange();
    
    expect(component.onFieldChange.emit).toHaveBeenCalledWith({
      amount: 100,
      currency: 'EUR'
    });
  });

  it('should handle amount change with currency selector disabled (default)', () => {
    component.displayAmount = '123.45';
    component.selectedCurrency = 'USD';
    spyOn(component.onFieldChange, 'emit');
    
    component.onAmountChange();
    
    expect(component.amount).toBe(123.45);
    expect(component.onFieldChange.emit).toHaveBeenCalledWith(123.45);
  });

  it('should handle amount change with currency selector enabled', () => {
    component.showCurrencySelector = true;
    component.displayAmount = '123.45';
    component.selectedCurrency = 'USD';
    spyOn(component.onFieldChange, 'emit');
    
    component.onAmountChange();
    
    expect(component.amount).toBe(123.45);
    expect(component.onFieldChange.emit).toHaveBeenCalledWith({
      amount: 123.45,
      currency: 'USD'
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
    component.amount = 100;
    component.displayAmount = 'invalid'; // All letters, becomes empty after strip
    
    component.onAmountChange();
    
    // @ts-ignore
    expect(component.amount).toBe('');
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
    component.widgetStructure = {
      field_name: 'test_field',
      widget_type: 'Money',
      name: 'Test Widget',
      description: 'Test Description',
      widget_params: {
        default_currency: 'EUR',
        show_currency_selector: true,
        decimal_places: 3,
        allow_negative: false
      }
    };
    
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
    spyOn(component.onFieldChange, 'emit');
    
    component['updateValue']();
    
    expect(component.onFieldChange.emit).toHaveBeenCalledWith('');
  });
});