import { Component, Input } from '@angular/core';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { CodeEditorModule } from '@ngstack/code-editor';
import { CommonModule } from '@angular/common';
import { UiSettingsService } from 'src/app/services/ui-settings.service';

@Component({
  selector: 'app-edit-json-editor',
  templateUrl: './json-editor.component.html',
  styleUrls: ['./json-editor.component.css'],
  imports: [CommonModule, CodeEditorModule],
})
export class JsonEditorEditComponent extends BaseEditFieldComponent {
  @Input() value: Object;

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
      language: 'json',
      uri: `${this.label}.json`,
      value: JSON.stringify(this.value, undefined, 4) || '{}'
    }

    this.codeEditorTheme = this._uiSettings.isDarkMode ? 'vs-dark' : 'vs';
  }
}
