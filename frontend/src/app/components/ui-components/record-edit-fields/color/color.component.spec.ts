import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ColorEditComponent } from './color.component';

describe('ColorEditComponent', () => {
	let component: ColorEditComponent;
	let fixture: ComponentFixture<ColorEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ColorEditComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ColorEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should return false for isValidColor when value is empty', () => {
		fixture.componentRef.setInput('value', '');
		expect(component.isValidColor).toBe(false);
	});

	it('should return false for isValidColor when value is null', () => {
		fixture.componentRef.setInput('value', null);
		expect(component.isValidColor).toBe(false);
	});

	it('should return true for isValidColor when value is a valid hex color', () => {
		fixture.componentRef.setInput('value', '#ff0000');
		expect(component.isValidColor).toBe(true);
	});

	it('should return true for isValidColor when value is a hex color without hash', () => {
		fixture.componentRef.setInput('value', 'ff0000');
		expect(component.isValidColor).toBe(true);
	});

	it('should return true for isValidColor when value is a valid rgb color', () => {
		fixture.componentRef.setInput('value', 'rgb(255, 0, 0)');
		expect(component.isValidColor).toBe(true);
	});

	it('should return false for isValidColor when value is invalid', () => {
		fixture.componentRef.setInput('value', 'notacolor');
		expect(component.isValidColor).toBe(false);
	});

	it('should return normalized hex for color picker', () => {
		fixture.componentRef.setInput('value', '#ff0000');
		expect(component.normalizedColorForPicker.toLowerCase()).toBe('#ff0000');
	});

	it('should return #000000 for invalid color in normalizedColorForPicker', () => {
		fixture.componentRef.setInput('value', 'invalid');
		expect(component.normalizedColorForPicker).toBe('#000000');
	});

	it('should return hex_hash format by default in formattedColorValue', () => {
		fixture.componentRef.setInput('value', 'rgb(255, 0, 0)');
		const result = component.formattedColorValue;
		expect(result).toMatch(/^#[A-Fa-f0-9]{6,8}$/);
	});

	it('should return hex without hash when format is hex', () => {
		fixture.componentRef.setInput('value', '#ff0000');
		fixture.componentRef.setInput('widgetStructure', { widget_params: { format: 'hex' } } as any);
		const result = component.formattedColorValue;
		expect(result).not.toContain('#');
	});

	it('should return rgb format when format is rgb', () => {
		fixture.componentRef.setInput('value', '#ff0000');
		fixture.componentRef.setInput('widgetStructure', { widget_params: { format: 'rgb' } } as any);
		const result = component.formattedColorValue;
		expect(result).toMatch(/^rgb/);
	});

	it('should handle hsl format and fallback to hex when hsl conversion fails', () => {
		fixture.componentRef.setInput('value', '#ff0000');
		fixture.componentRef.setInput('widgetStructure', { widget_params: { format: 'hsl' } } as any);
		const result = component.formattedColorValue;
		// colorString.get.hsl returns null for hex input, so it falls back to hex
		expect(result).toMatch(/^#|^hsl/);
	});

	it('should return original value for formattedColorValue when value is invalid', () => {
		fixture.componentRef.setInput('value', 'invalid');
		expect(component.formattedColorValue).toBe('invalid');
	});

	it('should emit onFieldChange when onTextInputChange is called', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		fixture.componentRef.setInput('value', '#ff0000');
		component.onTextInputChange();
		expect(component.onFieldChange.emit).toHaveBeenCalledWith('#ff0000');
	});

	it('should update value and emit onFieldChange when onColorPickerChange is called', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		const event = { target: { value: '#00ff00' } } as any;
		component.onColorPickerChange(event);
		expect(component.value()).toBeTruthy();
		expect(component.onFieldChange.emit).toHaveBeenCalled();
	});

	it('should set value directly when picker value cannot be parsed', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		const event = { target: { value: '' } } as any;
		component.onColorPickerChange(event);
		expect(component.value()).toBe('');
		expect(component.onFieldChange.emit).toHaveBeenCalledWith('');
	});
});
