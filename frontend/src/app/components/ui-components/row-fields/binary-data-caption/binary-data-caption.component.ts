import { Component, Input, OnInit } from '@angular/core';

import { TableField } from 'src/app/models/table';
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-static-text',
  templateUrl: './binary-data-caption.component.html',
  styleUrls: ['./binary-data-caption.component.css']
})
export class BinaryDataCaptionComponent implements OnInit {

  // @Input() label: string;
  @Input() structure: TableField;

  public label: string;

  constructor() { }

  ngOnInit(): void {
    this.label = normalizeFieldName(this.structure.column_name);
  }

}
