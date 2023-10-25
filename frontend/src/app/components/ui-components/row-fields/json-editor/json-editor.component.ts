import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';

import { TableField } from 'src/app/models/table';
// import { JsonEditorComponent as JsonEditor, JsonEditorOptions } from 'ang-jsoneditor';
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-json-editor',
  templateUrl: './json-editor.component.html',
  styleUrls: ['./json-editor.component.css']
})
export class JsonEditorComponent implements OnInit {
  @Input() value: Object;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() structure: TableField;

  @Output() onFieldChange = new EventEmitter();

  public label: string;

  ngOnInit(): void {
    this.label = normalizeFieldName(this.structure.column_name);
    this.value = JSON.stringify(this.value, undefined, 4) || '';
  }
}
