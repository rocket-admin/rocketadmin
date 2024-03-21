import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TableField, Widget } from 'src/app/models/table';

import { ConnectionsService } from 'src/app/services/connections.service';
import { DBtype } from 'src/app/models/connection';
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-filter-boolean',
  templateUrl: './boolean.component.html',
  styleUrls: ['./boolean.component.css']
})
export class BooleanFilterComponent implements OnInit {
  @Input() key: string;
  @Input() label: string;
  @Input() value;
  @Input() readonly: boolean;
  @Input() disabled: boolean;
  @Input() structure: TableField;
  @Input() widgetStructure: Widget;

  @Output() onFieldChange = new EventEmitter();

  public normalizedLabel: string;
  public isRadiogroup: boolean;
  private connectionType: DBtype;
  public booleanValue: boolean;

  constructor(
    private _connections: ConnectionsService,
  ) { }

  ngOnInit(): void {
    this.connectionType = this._connections.currentConnection.type;


    this.setBooleanValue();

    console.log('boolean this.value');
    console.log(this.booleanValue);

    this.onFieldChange.emit(this.booleanValue);

    this.isRadiogroup = (this.structure?.allow_null) || !!(this.widgetStructure?.widget_params?.structure?.allow_null);
    this.normalizedLabel = normalizeFieldName(this.label);
  }

  setBooleanValue() {
    if (typeof this.value === 'boolean' || this.value === null) {
      this.booleanValue = this.value;
    };

    switch (this.value) {
      case 0:
      case '0':
      case 'F':
      case 'N':
      case 'false':
        this.booleanValue = false;
        break;
      case 1:
      case '1':
      case 'T':
      case 'Y':
      case 'true':
        this.booleanValue = true;
        break;

    }
  }

  onBooleanChange() {
    console.log(this.connectionType);
    let formattedValue;
    switch (this.connectionType) {
      case DBtype.MySQL:
      case DBtype.MSSQL:
      case DBtype.Oracle:
        formattedValue = this.booleanValue === null ? null : Number(this.value);
        break;
      default:
        formattedValue = this.booleanValue;
    }

    console.log('formattedValue');
    console.log(formattedValue);

    this.onFieldChange.emit(formattedValue);
  }
}
