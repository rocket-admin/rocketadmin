import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CodeEditorModule } from '@ngstack/code-editor';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { WidgetComponent } from './widget.component';

describe('WidgetComponent', () => {
	let component: WidgetComponent;
	let fixture: ComponentFixture<WidgetComponent>;

	const mockWidget = {
		field_name: 'password',
		widget_type: 'Password',
		widget_params: '{"minLength": 8}',
		name: 'User Password',
		description: 'Password field',
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [WidgetComponent, BrowserAnimationsModule],
		})
			.overrideComponent(WidgetComponent, {
				remove: { imports: [CodeEditorModule] },
				add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] },
			})
			.compileComponents();

		fixture = TestBed.createComponent(WidgetComponent);
		component = fixture.componentInstance;

		component.widget = { ...mockWidget };
		component.index = 0;
		component.fields = ['email', 'username', 'password'];
		component.widgetTypes = ['Default', 'Password', 'Textarea', 'Code'];

		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should initialize mutableWidgetParams on init', () => {
		expect(component.mutableWidgetParams).toEqual({
			language: 'json',
			uri: 'widget-params-0.json',
			value: '{"minLength": 8}',
		});
	});

	it('should have correct code editor options', () => {
		expect(component.paramsEditorOptions.minimap.enabled).toBe(false);
		expect(component.paramsEditorOptions.wordWrap).toBe('on');
		expect(component.paramsEditorOptions.automaticLayout).toBe(true);
	});

	it('should have documentation URLs for widget types', () => {
		expect(component.docsUrls.Password).toContain('docs.rocketadmin.com');
		expect(component.docsUrls.Boolean).toContain('widgets_management#boolean');
		expect(component.docsUrls.Code).toContain('widgets_management#code');
	});

	it('should emit onSelectWidgetField when field is selected', () => {
		const emitSpy = vi.spyOn(component.onSelectWidgetField, 'emit');
		component.onSelectWidgetField.emit('email');
		expect(emitSpy).toHaveBeenCalledWith('email');
	});

	it('should emit onWidgetTypeChange when widget type changes', () => {
		const emitSpy = vi.spyOn(component.onWidgetTypeChange, 'emit');
		component.onWidgetTypeChange.emit('Textarea');
		expect(emitSpy).toHaveBeenCalledWith('Textarea');
	});

	it('should emit onWidgetDelete when delete is triggered', () => {
		const emitSpy = vi.spyOn(component.onWidgetDelete, 'emit');
		component.onWidgetDelete.emit('password');
		expect(emitSpy).toHaveBeenCalledWith('password');
	});

	it('should emit onWidgetParamsChange with value and fieldName', () => {
		const emitSpy = vi.spyOn(component.onWidgetParamsChange, 'emit');
		component.onWidgetParamsChange.emit({ value: '{"new": "params"}', fieldName: 'password' });
		expect(emitSpy).toHaveBeenCalledWith({ value: '{"new": "params"}', fieldName: 'password' });
	});

	it('should update mutableWidgetParams when widgetType changes', () => {
		const newParams = '{"newParam": true}';
		component.widget = { ...mockWidget, widget_params: newParams };

		component.ngOnChanges({
			widgetType: new SimpleChange('Password', 'Textarea', false),
		});

		expect(component.mutableWidgetParams.value).toBe(newParams);
	});

	it('should not update mutableWidgetParams when widgetType does not change', () => {
		const originalValue = component.mutableWidgetParams.value;

		component.ngOnChanges({
			someOtherProperty: new SimpleChange('old', 'new', false),
		});

		expect(component.mutableWidgetParams.value).toBe(originalValue);
	});
});
