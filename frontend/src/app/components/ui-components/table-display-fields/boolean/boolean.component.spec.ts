import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BooleanDisplayComponent } from './boolean.component';

describe('BooleanDisplayComponent', () => {
	let component: BooleanDisplayComponent;
	let fixture: ComponentFixture<BooleanDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [BooleanDisplayComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(BooleanDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should handle true value', () => {
		fixture.componentRef.setInput('value', true);
		expect(component.value()).toBe(true);
	});

	it('should handle false value', () => {
		fixture.componentRef.setInput('value', false);
		expect(component.value()).toBe(false);
	});

	it('should handle null value', () => {
		fixture.componentRef.setInput('value', null);
		expect(component.value()).toBeNull();
	});

	it('should invert colors when configured', () => {
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { invert_colors: true },
		});
		expect(component.invertColors).toBe(true);
	});
});
