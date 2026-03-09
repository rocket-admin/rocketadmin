import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LongTextEditComponent } from './long-text.component';

describe('LongTextEditComponent', () => {
	let component: LongTextEditComponent;
	let fixture: ComponentFixture<LongTextEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [LongTextEditComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(LongTextEditComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should set maxLength from structure character_maximum_length', () => {
		component.structure = { character_maximum_length: 1000 } as any;
		component.ngOnInit();
		expect(component.maxLength).toBe(1000);
	});

	it('should keep maxLength null when structure has no character_maximum_length', () => {
		component.structure = {} as any;
		component.ngOnInit();
		expect(component.maxLength).toBeNull();
	});

	it('should default rowsCount to 4 when no widget params', () => {
		component.ngOnInit();
		expect(component.rowsCount).toBe('4');
	});

	it('should parse rowsCount from widget params', () => {
		component.widgetStructure = { widget_params: { rows: '10' } } as any;
		component.ngOnInit();
		expect(component.rowsCount).toBe('10');
	});

	it('should parse validateType from widget params object', () => {
		component.widgetStructure = { widget_params: { validate: 'isJSON' } } as any;
		component.ngOnInit();
		expect(component.validateType).toBe('isJSON');
	});

	it('should parse validateType from widget params string', () => {
		component.widgetStructure = { widget_params: JSON.stringify({ validate: 'isEmail', rows: '6' }) } as any;
		component.ngOnInit();
		expect(component.validateType).toBe('isEmail');
		expect(component.rowsCount).toBe('6');
	});

	it('should parse regexPattern from widget params', () => {
		component.widgetStructure = { widget_params: { validate: 'regex', regex: '^\\d+$' } } as any;
		component.ngOnInit();
		expect(component.regexPattern).toBe('^\\d+$');
	});

	it('should return empty string for getValidationErrorMessage when no validateType', () => {
		component.validateType = null;
		expect(component.getValidationErrorMessage()).toBe('');
	});

	it('should return regex message for regex validateType', () => {
		component.validateType = 'regex';
		expect(component.getValidationErrorMessage()).toBe("Value doesn't match the required pattern");
	});

	it('should return correct message for known validateType', () => {
		component.validateType = 'isIP';
		expect(component.getValidationErrorMessage()).toBe('Invalid IP address');
	});

	it('should return fallback message for unknown validateType', () => {
		component.validateType = 'customRule';
		expect(component.getValidationErrorMessage()).toBe('Invalid customRule');
	});
});
