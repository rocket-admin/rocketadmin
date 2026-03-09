import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TextEditComponent } from './text.component';

describe('TextEditComponent', () => {
	let component: TextEditComponent;
	let fixture: ComponentFixture<TextEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TextEditComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(TextEditComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should set maxLength from structure character_maximum_length', () => {
		component.structure = { character_maximum_length: 255 } as any;
		component.ngOnInit();
		expect(component.maxLength).toBe(255);
	});

	it('should keep maxLength null when structure has no character_maximum_length', () => {
		component.structure = {} as any;
		component.ngOnInit();
		expect(component.maxLength).toBeNull();
	});

	it('should parse validateType from widget params object', () => {
		component.widgetStructure = { widget_params: { validate: 'isEmail' } } as any;
		component.ngOnInit();
		expect(component.validateType).toBe('isEmail');
	});

	it('should parse validateType from widget params string', () => {
		component.widgetStructure = { widget_params: JSON.stringify({ validate: 'isURL' }) } as any;
		component.ngOnInit();
		expect(component.validateType).toBe('isURL');
	});

	it('should parse regexPattern from widget params', () => {
		component.widgetStructure = { widget_params: { validate: 'regex', regex: '^[a-z]+$' } } as any;
		component.ngOnInit();
		expect(component.regexPattern).toBe('^[a-z]+$');
	});

	it('should return empty string for getValidationErrorMessage when no validateType', () => {
		component.validateType = null;
		expect(component.getValidationErrorMessage()).toBe('');
	});

	it('should return regex message for regex validateType', () => {
		component.validateType = 'regex';
		expect(component.getValidationErrorMessage()).toBe("Value doesn't match the required pattern");
	});

	it('should return correct message for isEmail validateType', () => {
		component.validateType = 'isEmail';
		expect(component.getValidationErrorMessage()).toBe('Invalid email address');
	});

	it('should return correct message for isURL validateType', () => {
		component.validateType = 'isURL';
		expect(component.getValidationErrorMessage()).toBe('Invalid URL');
	});

	it('should return correct message for isJSON validateType', () => {
		component.validateType = 'isJSON';
		expect(component.getValidationErrorMessage()).toBe('Invalid JSON');
	});

	it('should return fallback message for unknown validateType', () => {
		component.validateType = 'customValidator';
		expect(component.getValidationErrorMessage()).toBe('Invalid customValidator');
	});
});
