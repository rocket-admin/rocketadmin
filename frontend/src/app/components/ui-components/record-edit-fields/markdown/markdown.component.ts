import { CommonModule } from '@angular/common';
import { Component, inject, model } from '@angular/core';
import { CodeEditorModule } from '@ngstack/code-editor';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-markdown',
	templateUrl: './markdown.component.html',
	styleUrl: './markdown.component.css',
	imports: [CommonModule, CodeEditorModule],
})
export class MarkdownEditComponent extends BaseEditFieldComponent {
	readonly value = model<any>();

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
			language: 'markdown',
			uri: `${this.label()}.md`,
			value: this.value(),
		};

		this.codeEditorTheme = this._uiSettings.isDarkMode ? 'vs-dark' : 'vs';
	}
}
