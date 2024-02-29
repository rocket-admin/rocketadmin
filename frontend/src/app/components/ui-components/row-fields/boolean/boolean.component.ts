import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TableField, Widget } from 'src/app/models/table';

import { ConnectionsService } from 'src/app/services/connections.service';
import { DBtype } from 'src/app/models/connection';
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
  @Input() readonly: boolean;
  @Input() disabled: boolean;
  @Input() structure: TableField;
  @Input() widgetStructure: Widget;

  @Output() onFieldChange = new EventEmitter();

  public normalizedLabel: string;
  public isRadiogroup: boolean;
  private connectionType: DBtype;
  constructor(
    private _connections: ConnectionsService,
  ) { }

  ngOnInit(): void {
    this.connectionType = this._connections.currentConnection.type;

    if (this.value === true || this.value === 1 || this.value === 'Y' || this.value === 'T') {
      this.value = true;
    } else if (this.value === false || this.value === 0 || this.value === 'N' || this.value === 'F' || (!this.structure.allow_null && this.value === null)) {
      this.value = false;
    } else {
      this.value = null;
    }

    console.log('boolean this.value');
    console.log(this.value);

    this.isRadiogroup = (this.structure?.allow_null) || !!(this.widgetStructure?.widget_params?.structure?.allow_null);

    this.normalizedLabel = normalizeFieldName(this.label);
  }

  onBooleanChange() {
    console.log(this.connectionType);
    let formattedValue;
    switch (this.connectionType) {
      case DBtype.MySQL:
      case DBtype.MSSQL:
        formattedValue = this.value === null ? null : this.value ? 1 : 0;
        break;
      case DBtype.Postgres:
        formattedValue = this.value;
        break;
      case DBtype.Oracle:
        // Oracle might use 'Y'/'N' or 1/0; assuming 'Y'/'N' here
        if (this.value === null) {
          formattedValue = null;
        } else {
          formattedValue = this.value ? 'Y' : 'N';
        }
        break;
      default:
        formattedValue = this.value;
    }

    this.onFieldChange.emit(formattedValue);
  }
}
