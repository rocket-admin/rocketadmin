import { Component, Input } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
  selector: 'app-filter-json-editor',
  templateUrl: './json-editor.component.html',
  styleUrls: ['./json-editor.component.css']
})
export class JsonEditorFilterComponent extends BaseFilterFieldComponent {
  @Input() value: Object;

  public mutableCodeModel: Object;
  public codeEditorOptions = {
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  };

  ngOnInit(): void {
    super.ngOnInit();
    this.mutableCodeModel = {
      language: 'json',
      uri: `${this.label}.json`,
      value: JSON.stringify(this.value, undefined, 4) || '{}'
    }
  }
}
