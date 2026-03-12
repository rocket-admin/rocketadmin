import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CountryDisplayComponent } from './country.component';

describe('CountryDisplayComponent', () => {
	let component: CountryDisplayComponent;
	let fixture: ComponentFixture<CountryDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CountryDisplayComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CountryDisplayComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should display country name from code', () => {
		fixture.componentRef.setInput('value', 'US');
		component.ngOnInit();
		fixture.detectChanges();

		expect(component.countryName).toBe('United States');
	});

	it('should display dash for null', () => {
		fixture.componentRef.setInput('value', null);
		component.ngOnInit();
		fixture.detectChanges();

		expect(component.countryName).toBe('\u2014');
	});

	it('should respect show_flag widget param', () => {
		fixture.componentRef.setInput('value', 'US');
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { show_flag: false },
		});
		component.ngOnInit();
		fixture.detectChanges();

		expect(component.showFlag).toBe(false);
	});
});
