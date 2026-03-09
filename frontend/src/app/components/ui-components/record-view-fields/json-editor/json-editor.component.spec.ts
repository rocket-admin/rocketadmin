import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JsonEditorRecordViewComponent } from './json-editor.component';
import { UiSettingsService } from 'src/app/services/ui-settings.service';

describe('JsonEditorRecordViewComponent', () => {
	let component: JsonEditorRecordViewComponent;
	let fixture: ComponentFixture<JsonEditorRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [JsonEditorRecordViewComponent],
			providers: [
				{ provide: UiSettingsService, useValue: { isDarkMode: false } },
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(JsonEditorRecordViewComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should set JSON code model on init', () => {
		fixture.componentRef.setInput('value', '{"key":"value"}');
		fixture.componentRef.setInput('key', 'test');
		component.ngOnInit();
		expect(component.codeModel).toEqual({
			language: 'json',
			uri: 'test.json',
			value: '{"key":"value"}',
		});
	});
});
