import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RangeEditComponent } from './range.component';

describe('RangeEditComponent', () => {
	let component: RangeEditComponent;
	let fixture: ComponentFixture<RangeEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [RangeEditComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(RangeEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should have default min, max, and step values', () => {
		expect(component.min).toBe(0);
		expect(component.max).toBe(100);
		expect(component.step).toBe(1);
	});

	it('should parse widget params on init', () => {
		component.widgetStructure = {
			widget_params: { min: 10, max: 200, step: 5 },
		} as any;
		component.ngOnInit();
		expect(component.min).toBe(10);
		expect(component.max).toBe(200);
		expect(component.step).toBe(5);
	});

	it('should parse widget params on changes', () => {
		component.widgetStructure = {
			widget_params: { min: 5, max: 50, step: 2 },
		} as any;
		component.ngOnChanges();
		expect(component.min).toBe(5);
		expect(component.max).toBe(50);
		expect(component.step).toBe(2);
	});

	it('should keep defaults when widget_params is undefined', () => {
		component.widgetStructure = undefined;
		component.ngOnInit();
		expect(component.min).toBe(0);
		expect(component.max).toBe(100);
		expect(component.step).toBe(1);
	});

	it('should handle partial widget params', () => {
		component.widgetStructure = {
			widget_params: { min: 20 },
		} as any;
		component.ngOnInit();
		expect(component.min).toBe(20);
		expect(component.max).toBe(100);
		expect(component.step).toBe(1);
	});

	it('should emit onFieldChange when value changes', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		component.onValueChange(42);
		expect(component.value).toBe(42);
		expect(component.onFieldChange.emit).toHaveBeenCalledWith(42);
	});
});
