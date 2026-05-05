import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoneyDisplayComponent } from './money.component';

describe('MoneyDisplayComponent', () => {
	let component: MoneyDisplayComponent;
	let fixture: ComponentFixture<MoneyDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MoneyDisplayComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(MoneyDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display formatted value with currency', () => {
		fixture.componentRef.setInput('value', 42.5);
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { default_currency: 'USD' },
		});
		component.ngOnInit();
		fixture.detectChanges();
		expect(component.formattedValue).toBe('$42.50');
	});

	it('should display dash for null', () => {
		fixture.componentRef.setInput('value', null);
		expect(component.formattedValue).toBe('');
	});

	it('should divide cents to major units when cents=true (USD)', () => {
		fixture.componentRef.setInput('value', 1099);
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { default_currency: 'USD', cents: true },
		});
		component.ngOnInit();
		fixture.detectChanges();
		expect(component.formattedValue).toBe('$10.99');
	});

	it('should not divide for zero-decimal currencies when cents=true (JPY)', () => {
		fixture.componentRef.setInput('value', 1099);
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { default_currency: 'JPY', cents: true },
		});
		component.ngOnInit();
		fixture.detectChanges();
		expect(component.formattedValue).toBe('¥1099');
	});

	it('should render zero amount instead of empty string', () => {
		fixture.componentRef.setInput('value', 0);
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { default_currency: 'USD', cents: true },
		});
		component.ngOnInit();
		fixture.detectChanges();
		expect(component.formattedValue).toBe('$0.00');
	});

	it('should ignore widget_params.decimal_places when cents=true and currency is zero-decimal', () => {
		fixture.componentRef.setInput('value', 500);
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { default_currency: 'JPY', cents: true, decimal_places: 4 },
		});
		component.ngOnInit();
		fixture.detectChanges();
		expect(component.formattedValue).toBe('¥500');
	});
});
