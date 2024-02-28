import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { TableField, Widget } from 'src/app/models/table';
import { normalizeFieldName } from '../../../../lib/normalize';
import { DBtype } from 'src/app/models/connection';
import { ConnectionsService } from 'src/app/services/connections.service';

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

    if (this.value) {
      this.value = true;
    } else if (this.value === 0 || this.value === '') {
      this.value = false;
    } else {
      this.value = null;
    }

    this.isRadiogroup = (this.structure?.allow_null) || !!(this.widgetStructure?.widget_params?.structure?.allow_null);

    this.normalizedLabel = normalizeFieldName(this.label);
  }

  onBooleanChange() {
    let formattedBoolean = this.value;

    this.onFieldChange.emit(formattedBoolean);
  }
}
