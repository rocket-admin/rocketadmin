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

  public normalizedLabel: string;
  public mutableValue: Object;
  public codeEditorOptions = {
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  };

  constructor() {}

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
    this.mutableValue = JSON.stringify(this.value, undefined, 4) || '{}';
  }
}
