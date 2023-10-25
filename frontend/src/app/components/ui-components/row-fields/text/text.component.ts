import { Component, EventEmitter, Injectable, Input, OnInit, Output } from '@angular/core';

import { TableField, Widget } from 'src/app/models/table';
import { normalizeFieldName } from '../../../../lib/normalize';

@Injectable()

@Component({
  selector: 'app-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.css']
})
export class TextComponent implements OnInit {
  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() structure: TableField;
  @Input() widgetStructure: Widget;

  @Output() onFieldChange = new EventEmitter();

  static type = 'text';
  public label: string;

  constructor() { }

  ngOnInit(): void {
    this.label = normalizeFieldName(this.structure.column_name || this.widgetStructure.field_name );
  }
}
