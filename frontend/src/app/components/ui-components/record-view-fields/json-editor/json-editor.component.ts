import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { Component, Injectable } from '@angular/core';
import { CodeEditorModule } from '@ngstack/code-editor';
import { UiSettingsService } from 'src/app/services/ui-settings.service';

@Injectable()
@Component({
  selector: 'app-json-editor-record-view',
  templateUrl: './json-editor.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './json-editor.component.css'],
  imports: [CodeEditorModule]
})
export class JsonEditorRecordViewComponent extends BaseRecordViewFieldComponent {
  public codeModel: Object;
  public codeEditorOptions = {
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    lineNumbers: 'off'
  };
  public codeEditorTheme = 'vs-dark';

  constructor(
    private _uiSettings: UiSettingsService,
  ) {
    super();
  }

  ngOnInit(): void {
    this.codeModel = {
      language: 'json',
      uri: `${this.key}.json`,
      value: this.value
    }

    this.codeEditorTheme = this._uiSettings.editorTheme;
  }
}
