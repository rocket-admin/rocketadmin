import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RangeDisplayComponent } from './range.component';

describe('RangeDisplayComponent', () => {
	let component: RangeDisplayComponent;
	let fixture: ComponentFixture<RangeDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [RangeDisplayComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(RangeDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display value with max', () => {
		fixture.componentRef.setInput('value', 50);
		component.ngOnInit();
		fixture.detectChanges();
		expect(component.displayValue).toBe('50 / 100');
	});

	it('should parse min/max from widget params', () => {
		fixture.componentRef.setInput('value', 75);
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { min: 0, max: 200, step: 5 },
		});
		component.ngOnInit();
		fixture.detectChanges();
		expect(component.min).toBe(0);
		expect(component.max).toBe(200);
		expect(component.step).toBe(5);
		expect(component.displayValue).toBe('75 / 200');
	});
});
