import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CodeEditorModule } from '@ngstack/code-editor';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { JsonEditorFilterComponent } from './json-editor.component';

describe('JsonEditorFilterComponent', () => {
	let component: JsonEditorFilterComponent;
	let fixture: ComponentFixture<JsonEditorFilterComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [JsonEditorFilterComponent, BrowserAnimationsModule],
		})
			.overrideComponent(JsonEditorFilterComponent, {
				remove: { imports: [CodeEditorModule] },
				add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] },
			})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(JsonEditorFilterComponent);
		component = fixture.componentInstance;
		component.label = 'config';
		component.value = { key: 'value', nested: { data: 123 } };
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
		expect((component.mutableCodeModel as any).uri).toBe('config.json');
	});

	it('should stringify value with formatting', () => {
		const modelValue = (component.mutableCodeModel as any).value;
		expect(modelValue).toContain('"key": "value"');
		expect(modelValue).toContain('"nested"');
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

	it('should normalize label from base class', () => {
		component.label = 'user_config_data';
		component.ngOnInit();
		expect(component.normalizedLabel).toBeDefined();
	});
});
