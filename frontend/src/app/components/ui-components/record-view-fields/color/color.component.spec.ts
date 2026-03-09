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
		component.value = '#ff0000';
		expect(component.isValidColor).toBe(true);
	});

	it('should return false for invalid color', () => {
		component.value = 'notacolor';
		expect(component.isValidColor).toBe(false);
	});

	it('should normalize color to hex format', () => {
		component.value = '#ff0000';
		expect(component.normalizedColorForDisplay).toBe('#ff0000');
	});
});
