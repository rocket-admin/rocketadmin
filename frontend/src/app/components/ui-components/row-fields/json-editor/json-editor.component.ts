import { Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
  selector: 'app-row-json-editor',
  templateUrl: './json-editor.component.html',
  styleUrls: ['./json-editor.component.css']
})
export class JsonEditorRowComponent extends BaseRowFieldComponent {
  @Input() value: Object;

  public mutableCodeModel: Object;
  public codeEditorOptions = {
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  };

  ngOnInit(): void {
    this.mutableCodeModel = {
      language: 'json',
      uri: `${this.label}.json`,
      value: JSON.stringify(this.value, undefined, 4) || '{}'
  }
  }
}
