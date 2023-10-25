import { Component, Input, OnInit } from '@angular/core';

import { TableField } from 'src/app/models/table';
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-static-text',
  templateUrl: './static-text.component.html',
  styleUrls: ['./static-text.component.css']
})
export class StaticTextComponent implements OnInit {

  @Input() label: string;
  @Input() value: string;
  @Input() structure: TableField;

  public normalizedLabel: string;

  constructor() { }

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
  }

}
