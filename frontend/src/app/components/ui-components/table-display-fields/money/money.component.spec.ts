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
});
