import { Component, Input, OnInit } from '@angular/core';

import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-filter-static-text',
  templateUrl: './static-text.component.html',
  styleUrls: ['./static-text.component.css']
})
export class StaticTextFilterComponent implements OnInit {

  @Input() label: string;
  @Input() value: string;

  public normalizedLabel: string;

  constructor() { }

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
  }

}
