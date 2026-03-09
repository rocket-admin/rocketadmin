import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColorRecordViewComponent } from './color.component';

describe('ColorRecordViewComponent', () => {
	let component: ColorRecordViewComponent;
	let fixture: ComponentFixture<ColorRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ColorRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ColorRecordViewComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should validate hex color', () => {
		fixture.componentRef.setInput('value', '#ff0000');
		expect(component.isValidColor).toBe(true);
	});

	it('should return false for invalid color', () => {
		fixture.componentRef.setInput('value', 'notacolor');
		expect(component.isValidColor).toBe(false);
	});

	it('should normalize color to hex format', () => {
		fixture.componentRef.setInput('value', '#ff0000');
		expect(component.normalizedColorForDisplay).toBe('#ff0000');
	});
});
