import { provideHttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CodeEditorModule } from '@ngstack/code-editor';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { CodeEditComponent } from './code.component';

describe('CodeEditComponent', () => {
	let component: CodeEditComponent;
	let fixture: ComponentFixture<CodeEditComponent>;

	const mockUiSettingsService = {
		editorTheme: 'vs-dark',
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CodeEditComponent, BrowserAnimationsModule],
			providers: [provideHttpClient(), { provide: UiSettingsService, useValue: mockUiSettingsService }],
		})
			.overrideComponent(CodeEditComponent, {
				remove: { imports: [CodeEditorModule] },
				add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] },
			})
			.compileComponents();

		fixture = TestBed.createComponent(CodeEditComponent);
		component = fixture.componentInstance;

		component.widgetStructure = {
			widget_params: {
				language: 'css',
			},
		} as any;
		component.label = 'styles';
		component.value = '.container { display: flex; }';

		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should initialize mutableCodeModel with correct language from widget params', () => {
		expect(component.mutableCodeModel).toBeDefined();
		expect((component.mutableCodeModel as any).language).toBe('css');
	});

	it('should set URI based on label', () => {
		expect((component.mutableCodeModel as any).uri).toBe('styles.json');
	});

	it('should set value from input', () => {
		expect((component.mutableCodeModel as any).value).toBe('.container { display: flex; }');
	});

	it('should use editor theme from UiSettingsService', () => {
		expect(component.codeEditorTheme).toBe('vs-dark');
	});

	it('should have correct code editor options', () => {
		expect(component.codeEditorOptions.minimap.enabled).toBe(false);
		expect(component.codeEditorOptions.automaticLayout).toBe(true);
		expect(component.codeEditorOptions.scrollBeyondLastLine).toBe(false);
		expect(component.codeEditorOptions.wordWrap).toBe('on');
	});

	it('should support different languages', () => {
		component.widgetStructure = {
			widget_params: {
				language: 'javascript',
			},
		} as any;
		component.label = 'script';
		component.value = 'console.log("hello");';
		component.ngOnInit();

		expect((component.mutableCodeModel as any).language).toBe('javascript');
	});

	it('should normalize label from base class', () => {
		component.label = 'custom_styles';
		component.ngOnInit();
		expect(component.normalizedLabel).toBeDefined();
	});
});
