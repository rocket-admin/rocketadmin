import { Component, Input, OnInit } from '@angular/core';

import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-filter-static-text',
  templateUrl: './binary-data-caption.component.html',
  styleUrls: ['./binary-data-caption.component.css']
})
export class BinaryDataCaptionFilterComponent implements OnInit {

  @Input() label: string;

  public normalizedLabel: string;

  constructor() { }

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
  }
}
