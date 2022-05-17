import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TableField, Widget } from 'src/app/models/table';
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.css']
})
export class SelectComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() structure: TableField;
  @Input() widgetStructure: Widget;

  @Output() onFieldChange = new EventEmitter();

  public normalizedLabel: string;
  public options: string[];

  originalOrder = () => { return 0; }

  constructor() { }

  ngOnInit(): void {
    if (this.widgetStructure) {
      this.options = this.widgetStructure.widget_params.options;
    } else if (this.structure) {
      this.options = this.structure.data_type_params;
    }
    this.normalizedLabel = normalizeFieldName(this.label);
  }
}
