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
		component.widgetStructure = {
			widget_params: { default_currency: 'USD' },
		} as any;
		component.value = 42.5;
		component.ngOnInit();
		expect(component.formattedValue).toContain('$');
		expect(component.formattedValue).toContain('42.50');
	});

	it('should return empty string for null value', () => {
		component.widgetStructure = {
			widget_params: { default_currency: 'USD' },
		} as any;
		component.value = null;
		component.ngOnInit();
		expect(component.formattedValue).toBe('');
	});

	it('should handle object value with amount and currency', () => {
		component.widgetStructure = {
			widget_params: { default_currency: 'USD' },
		} as any;
		component.value = { amount: 100, currency: 'EUR' };
		component.ngOnInit();
		expect(component.formattedValue).toContain('100.00');
	});
});
