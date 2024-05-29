import { Component, Input, OnInit } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DBtype } from 'src/app/models/connection';
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-row-boolean',
  templateUrl: './boolean.component.html',
  styleUrls: ['./boolean.component.css']
})
export class BooleanRowComponent extends BaseRowFieldComponent {
  @Input() value: boolean | number | string | null;

  public isRadiogroup: boolean;
  private connectionType: DBtype;

  constructor(
    private _connections: ConnectionsService,
  ) {
    super();
  }

  ngOnInit(): void {
    this.connectionType = this._connections.currentConnection.type;

    if (this.value) {
      this.value = true;
    } else if (this.value === 0 || this.value === '' || this.value === false) {
      this.value = false;
    } else {
      this.value = null;
    }

    this.onFieldChange.emit(this.value);

    this.isRadiogroup = (this.structure?.allow_null) || !!(this.widgetStructure?.widget_params?.structure?.allow_null);
  }

  onToggleChange(optionValue: boolean): void {
    if (this.value === optionValue) {
      this.value = null;
    } else {
      this.value = optionValue;
    }
    this.onFieldChange.emit(this.value);
  }
}