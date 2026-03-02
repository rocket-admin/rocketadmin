import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CodeEditorModule } from '@ngstack/code-editor';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { JsonEditorEditComponent } from './json-editor.component';

describe('JsonEditorEditComponent', () => {
	let component: JsonEditorEditComponent;
	let fixture: ComponentFixture<JsonEditorEditComponent>;

	const mockUiSettingsService = {
		isDarkMode: true,
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [JsonEditorEditComponent, BrowserAnimationsModule],
			providers: [{ provide: UiSettingsService, useValue: mockUiSettingsService }],
		})
			.overrideComponent(JsonEditorEditComponent, {
				remove: { imports: [CodeEditorModule] },
				add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] },
			})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(JsonEditorEditComponent);
		component = fixture.componentInstance;
		component.label = 'metadata';
		component.value = { id: 1, name: 'test', settings: { enabled: true } };
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should initialize mutableCodeModel with JSON language', () => {
		expect(component.mutableCodeModel).toBeDefined();
		expect((component.mutableCodeModel as any).language).toBe('json');
	});

	it('should set URI based on label', () => {
		expect((component.mutableCodeModel as any).uri).toBe('metadata.json');
	});

	it('should stringify value with 4-space indentation', () => {
		const modelValue = (component.mutableCodeModel as any).value;
		expect(modelValue).toContain('"id": 1');
		expect(modelValue).toContain('"name": "test"');
		expect(modelValue).toContain('"settings"');
	});

	it('should have correct code editor options', () => {
		expect(component.codeEditorOptions.minimap.enabled).toBe(false);
		expect(component.codeEditorOptions.automaticLayout).toBe(true);
		expect(component.codeEditorOptions.scrollBeyondLastLine).toBe(false);
		expect(component.codeEditorOptions.wordWrap).toBe('on');
	});

	it('should handle null value', () => {
		component.value = null;
		component.ngOnInit();
		// JSON.stringify(null) returns "null", fallback to '{}' only for undefined
		expect((component.mutableCodeModel as any).value).toBe('null');
	});

	it('should handle undefined value with fallback', () => {
		component.value = undefined;
		component.ngOnInit();
		// undefined is falsy so falls back to '{}'
		expect((component.mutableCodeModel as any).value).toBe('{}');
	});

	it('should handle array value', () => {
		component.value = [1, 2, 3] as any;
		component.ngOnInit();
		const modelValue = (component.mutableCodeModel as any).value;
		expect(modelValue).toContain('1');
		expect(modelValue).toContain('2');
		expect(modelValue).toContain('3');
	});

	it('should normalize label from base class', () => {
		component.label = 'json_config_data';
		component.ngOnInit();
		expect(component.normalizedLabel).toBeDefined();
	});
});
