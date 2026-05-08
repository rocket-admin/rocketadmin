import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoneyRecordViewComponent } from './money.component';

describe('MoneyRecordViewComponent', () => {
	let component: MoneyRecordViewComponent;
	let fixture: ComponentFixture<MoneyRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MoneyRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(MoneyRecordViewComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should format value with currency symbol', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { default_currency: 'USD' },
		});
		fixture.componentRef.setInput('value', 42.5);
		component.ngOnInit();
		expect(component.formattedValue).toContain('$');
		expect(component.formattedValue).toContain('42.50');
	});

	it('should return empty string for null value', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { default_currency: 'USD' },
		});
		fixture.componentRef.setInput('value', null);
		component.ngOnInit();
		expect(component.formattedValue).toBe('');
	});

	it('should handle object value with amount and currency', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { default_currency: 'USD' },
		});
		fixture.componentRef.setInput('value', { amount: 100, currency: 'EUR' });
		component.ngOnInit();
		expect(component.formattedValue).toContain('100.00');
	});

	it('should divide cents to major units when cents=true (USD)', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { default_currency: 'USD', cents: true },
		});
		fixture.componentRef.setInput('value', 2599);
		component.ngOnInit();
		expect(component.formattedValue).toBe('$25.99');
	});

	it('should not divide for zero-decimal currencies when cents=true (JPY)', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { default_currency: 'JPY', cents: true },
		});
		fixture.componentRef.setInput('value', 1099);
		component.ngOnInit();
		expect(component.formattedValue).toBe('¥1099');
	});

	it('should render zero amount as $0.00 with cents=true', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { default_currency: 'USD', cents: true },
		});
		fixture.componentRef.setInput('value', 0);
		component.ngOnInit();
		expect(component.formattedValue).toBe('$0.00');
	});

	it('should treat object amount as cents when cents=true', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { default_currency: 'USD', cents: true },
		});
		fixture.componentRef.setInput('value', { amount: 1099, currency: 'EUR' });
		component.ngOnInit();
		expect(component.formattedValue).toContain('10.99');
	});
});
