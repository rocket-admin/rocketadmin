import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { TableField, Widget } from 'src/app/models/table';
import { normalizeFieldName } from '../../../../lib/normalize';
import { DBtype } from 'src/app/models/connection';
import { ConnectionsService } from 'src/app/services/connections.service';

@Component({
  selector: 'app-row-boolean',
  templateUrl: './boolean.component.html',
  styleUrls: ['./boolean.component.css']
})
export class BooleanRowComponent implements OnInit {
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

    console.log('this.value in ngOnInit');
    console.log(this.value);

    if (this.value) {
      this.value = true;
    } else if (this.value === 0 || this.value === '' || this.value === false) {
      this.value = false;
    } else {
      this.value = null;
    }

    console.log('this.value in ngOnInit after');
    console.log(this.value);

    this.onFieldChange.emit(this.value);

    this.isRadiogroup = (this.structure?.allow_null) || !!(this.widgetStructure?.widget_params?.structure?.allow_null);

    this.normalizedLabel = normalizeFieldName(this.label);
  }

  onToggleChange(optionValue: boolean): void {
    console.log('optionValue');
    console.log(optionValue);
    console.log('this.value');
    console.log(this.value);
    if (this.value === optionValue) {
      this.value = null;
    } else {
      this.value = optionValue;
    }
    console.log('this.value after');
    console.log(this.value);
    this.onFieldChange.emit(this.value);
  }
}