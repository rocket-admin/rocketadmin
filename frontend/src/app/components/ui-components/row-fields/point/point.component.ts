import { Component, Input, OnInit } from '@angular/core';
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-point',
  templateUrl: './point.component.html',
  styleUrls: ['./point.component.css']
})
export class PointComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value;
  @Input() required: boolean;
  @Input() readonly: boolean;

  public normalizedLabel: string;

  constructor() { }

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
  }

}
