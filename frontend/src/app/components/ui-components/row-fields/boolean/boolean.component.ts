import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { TableField } from 'src/app/models/table';
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-boolean',
  templateUrl: './boolean.component.html',
  styleUrls: ['./boolean.component.css']
})
export class BooleanComponent implements OnInit {
  @Input() key: string;
  @Input() label: string;
  @Input() value;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() structure: TableField;

  @Output() onFieldChange = new EventEmitter();

  public normalizedLabel: string;
  public isRadiogroup: boolean;
  constructor() { }

  ngOnInit(): void {
    if (this.value) {
      this.value = true;
    } else if (this.value === 0) {
      this.value = false;
    } else {
      this.value = null;
    }

    this.isRadiogroup = this.structure.allow_null;

    this.normalizedLabel = normalizeFieldName(this.label);
  }
}
