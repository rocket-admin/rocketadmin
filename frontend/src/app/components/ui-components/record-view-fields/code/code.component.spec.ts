import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CodeRecordViewComponent } from './code.component';
import { UiSettingsService } from 'src/app/services/ui-settings.service';

describe('CodeRecordViewComponent', () => {
	let component: CodeRecordViewComponent;
	let fixture: ComponentFixture<CodeRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CodeRecordViewComponent],
			providers: [
				{ provide: UiSettingsService, useValue: { isDarkMode: false } },
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CodeRecordViewComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should set code model on init', () => {
		fixture.componentRef.setInput('value', 'console.log()');
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { language: 'javascript' },
			field_name: 'code',
		});
		fixture.componentRef.setInput('key', 'test');
		component.ngOnInit();
		expect(component.codeModel).toEqual({
			language: 'javascript',
			uri: 'test.json',
			value: 'console.log()',
		});
	});

	it('should use light theme when not dark mode', () => {
		fixture.componentRef.setInput('value', 'code');
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { language: 'javascript' },
			field_name: 'code',
		});
		fixture.componentRef.setInput('key', 'test');
		component.ngOnInit();
		expect(component.codeEditorTheme).toBe('vs');
	});
});
