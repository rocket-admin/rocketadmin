import { provideHttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CodeEditorModule } from '@ngstack/code-editor';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { MarkdownEditComponent } from './markdown.component';

describe('MarkdownEditComponent', () => {
	let component: MarkdownEditComponent;
	let fixture: ComponentFixture<MarkdownEditComponent>;

	const mockUiSettingsService = {
		editorTheme: 'vs-dark',
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MarkdownEditComponent, BrowserAnimationsModule],
			providers: [provideHttpClient(), { provide: UiSettingsService, useValue: mockUiSettingsService }],
		})
			.overrideComponent(MarkdownEditComponent, {
				remove: { imports: [CodeEditorModule] },
				add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] },
			})
			.compileComponents();

		fixture = TestBed.createComponent(MarkdownEditComponent);
		component = fixture.componentInstance;

		component.widgetStructure = {
			widget_params: {},
		} as any;
		component.label = 'description';
		component.value = '# Hello World\n\nThis is **bold** text.';

		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should initialize mutableCodeModel with markdown language', () => {
		expect(component.mutableCodeModel).toBeDefined();
		expect((component.mutableCodeModel as any).language).toBe('markdown');
	});

	it('should set URI with .md extension based on label', () => {
		expect((component.mutableCodeModel as any).uri).toBe('description.md');
	});

	it('should set value from input', () => {
		expect((component.mutableCodeModel as any).value).toBe('# Hello World\n\nThis is **bold** text.');
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

	it('should use light theme when configured', () => {
		const lightThemeService = { editorTheme: 'vs' };
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			imports: [MarkdownEditComponent, BrowserAnimationsModule],
			providers: [provideHttpClient(), { provide: UiSettingsService, useValue: lightThemeService }],
		})
			.overrideComponent(MarkdownEditComponent, {
				remove: { imports: [CodeEditorModule] },
				add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] },
			})
			.compileComponents();

		const newFixture = TestBed.createComponent(MarkdownEditComponent);
		const newComponent = newFixture.componentInstance;
		newComponent.widgetStructure = { widget_params: {} } as any;
		newComponent.label = 'content';
		newComponent.value = 'test';
		newFixture.detectChanges();

		expect(newComponent.codeEditorTheme).toBe('vs');
	});

	it('should normalize label from base class', () => {
		component.label = 'product_description';
		component.ngOnInit();
		expect(component.normalizedLabel).toBeDefined();
	});
});
