import { Component, Input } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';
import { CommonModule } from '@angular/common';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DBtype } from 'src/app/models/connection';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

@Component({
  selector: 'app-filter-boolean',
  templateUrl: './boolean.component.html',
  styleUrls: ['./boolean.component.css'],
  imports: [CommonModule, FormsModule, MatButtonToggleModule]
})
export class BooleanFilterComponent extends BaseFilterFieldComponent {
  @Input() value;

  public isRadiogroup: boolean;
  private connectionType: DBtype;
  public booleanValue: boolean | "unknown";

  constructor(
    private _connections: ConnectionsService,
  ) {
    super();
  }

  ngOnInit(): void {
    super.ngOnInit();
    this.connectionType = this._connections.currentConnection.type;
    this.setBooleanValue();
    
    // Parse widget parameters if available
    let parsedParams = null;
    if (this.widgetStructure?.widget_params) {
      parsedParams = typeof this.widgetStructure.widget_params === 'string' 
        ? JSON.parse(this.widgetStructure.widget_params) 
        : this.widgetStructure.widget_params;
    }
    
    // Check allow_null from either structure or widget params
    this.isRadiogroup = (this.structure?.allow_null) || !!(parsedParams?.allow_null);
  }

  setBooleanValue() {
    if (typeof this.value === 'boolean') {
      this.booleanValue = this.value;
    } else if (this.value === null) {
      this.booleanValue = "unknown";
      console.log('i entered condition this.value === null');
    } else {
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
  }

  onBooleanChange() {
    console.log(this.connectionType);
    let formattedValue;
    switch (this.connectionType) {
      case DBtype.MySQL:
      case DBtype.MSSQL:
      case DBtype.Oracle:
        formattedValue = this.booleanValue === "unknown" ? null : Number(this.booleanValue);
        break;
      default:
        formattedValue = this.booleanValue === "unknown" ? null : this.booleanValue;
    }

    this.onFieldChange.emit(formattedValue);
  }
}
