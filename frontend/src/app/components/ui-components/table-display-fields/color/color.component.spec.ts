import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColorDisplayComponent } from './color.component';

describe('ColorDisplayComponent', () => {
	let component: ColorDisplayComponent;
	let fixture: ComponentFixture<ColorDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ColorDisplayComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ColorDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should detect valid color', () => {
		fixture.componentRef.setInput('value', '#ff0000');
		fixture.detectChanges();

		expect(component.isValidColor).toBe(true);
	});

	it('should detect invalid color', () => {
		fixture.componentRef.setInput('value', 'not-a-color');
		fixture.detectChanges();

		expect(component.isValidColor).toBe(false);
	});

	it('should normalize hex color', () => {
		fixture.componentRef.setInput('value', 'ff0000');
		fixture.detectChanges();

		expect(component.normalizedColorForDisplay).toBe('#ff0000');
	});
});
