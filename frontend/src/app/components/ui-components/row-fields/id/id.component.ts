import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-id',
  templateUrl: './id.component.html',
  styleUrls: ['./id.component.css']
})
export class IdComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;

  @Output() onFieldChange = new EventEmitter();

  public normalizedLabel: string;

  constructor() { }

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
  }

}
