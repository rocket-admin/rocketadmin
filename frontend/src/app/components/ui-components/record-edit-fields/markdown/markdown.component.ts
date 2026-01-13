import { Component, Input } from '@angular/core';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { CodeEditorModule } from '@ngstack/code-editor';
import { CommonModule } from '@angular/common';
import { UiSettingsService } from 'src/app/services/ui-settings.service';

@Component({
  selector: 'app-edit-markdown',
  templateUrl: './markdown.component.html',
  styleUrl: './markdown.component.css',
  imports: [CommonModule, CodeEditorModule],
})
export class MarkdownEditComponent extends BaseEditFieldComponent {
  @Input() value;

  public mutableCodeModel: Object;
  public codeEditorOptions = {
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  };
  public codeEditorTheme = 'vs-dark';

  constructor(
    private _uiSettings: UiSettingsService,
  ) {
    super();
  }

  ngOnInit(): void {
    super.ngOnInit();
    this.mutableCodeModel = {
      language: 'markdown',
      uri: `${this.label}.md`,
      value: this.value
    }

    this.codeEditorTheme = this._uiSettings.editorTheme;
  }
}
