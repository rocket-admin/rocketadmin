import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CountryRecordViewComponent } from './country.component';

describe('CountryRecordViewComponent', () => {
	let component: CountryRecordViewComponent;
	let fixture: ComponentFixture<CountryRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CountryRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CountryRecordViewComponent);
		component = fixture.componentInstance;
		// Don't call fixture.detectChanges() here - let individual tests set inputs first
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should display country name from code', () => {
		component.value = 'US';
		component.ngOnInit();
		expect(component.countryName).toContain('United States');
	});

	it('should display em dash for null value', () => {
		component.value = null;
		component.ngOnInit();
		expect(component.countryName).toBe('—');
	});

	it('should respect show_flag widget param', () => {
		component.value = 'US';
		component.widgetStructure = { widget_params: { show_flag: false } } as any;
		component.ngOnInit();
		expect(component.showFlag).toBe(false);
	});
});
