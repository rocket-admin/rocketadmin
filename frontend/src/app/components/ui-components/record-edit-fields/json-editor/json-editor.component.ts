import { CommonModule } from '@angular/common';
import { Component, inject, model } from '@angular/core';
import { CodeEditorModule } from '@ngstack/code-editor';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-json-editor',
	templateUrl: './json-editor.component.html',
	styleUrls: ['./json-editor.component.css'],
	imports: [CommonModule, CodeEditorModule],
})
export class JsonEditorEditComponent extends BaseEditFieldComponent {
	readonly value = model<Object>();

	private _uiSettings = inject(UiSettingsService);

	public mutableCodeModel: Object;
	public codeEditorOptions = {
		minimap: { enabled: false },
		automaticLayout: true,
		scrollBeyondLastLine: false,
		wordWrap: 'on',
	};
	public codeEditorTheme = 'vs-dark';

	ngOnInit(): void {
		super.ngOnInit();
		this.mutableCodeModel = {
			language: 'json',
			uri: `${this.label()}.json`,
			value: JSON.stringify(this.value(), undefined, 4) || '{}',
		};

		this.codeEditorTheme = this._uiSettings.isDarkMode ? 'vs-dark' : 'vs';
	}
}
