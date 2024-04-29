import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';

import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-row-json-editor',
  templateUrl: './json-editor.component.html',
  styleUrls: ['./json-editor.component.css']
})
export class JsonEditorRowComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value: Object;
  @Input() required: boolean;
  @Input() readonly: boolean;

  @Output() onFieldChange = new EventEmitter();

  // @ViewChild(JsonEditor, { static: false }) editor: JsonEditor;

  public normalizedLabel: string;
  // public editorOptions: JsonEditorOptions;

  constructor() {
    // this.editorOptions = new JsonEditorOptions();
  }

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
    this.value = JSON.stringify(this.value, undefined, 4) || '';
  }

  // onJSONchange(event) {
  //   this.onFieldChange.emit(JSON.parse(event));
  // }

}
