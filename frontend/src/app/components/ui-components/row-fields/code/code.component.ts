import { Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { CodeEditorModule } from '@ngstack/code-editor';
import { CommonModule } from '@angular/common';
import { UiSettingsService } from 'src/app/services/ui-settings.service';

@Component({
  selector: 'app-code',
  templateUrl: './code.component.html',
  styleUrl: './code.component.css',
  imports: [CommonModule, CodeEditorModule],
})
export class CodeRowComponent extends BaseRowFieldComponent {
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
      language: `${this.widgetStructure.widget_params.language}`,
      uri: `${this.label}.json`,
      value: this.value
    }

    this.codeEditorTheme = this._uiSettings.editorTheme;
  }
}
