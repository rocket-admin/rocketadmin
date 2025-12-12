import { Component, Input, OnInit } from '@angular/core';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { CommonModule } from '@angular/common';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DBtype } from 'src/app/models/connection';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

@Component({
  selector: 'app-edit-boolean',
  templateUrl: './boolean.component.html',
  styleUrls: ['./boolean.component.css'],
  imports: [CommonModule, FormsModule, MatButtonToggleModule]
})
export class BooleanEditComponent extends BaseEditFieldComponent {
  @Input() value: boolean | number | string | null;

  public isRadiogroup: boolean;
  private connectionType: DBtype;

  constructor(
    private _connections: ConnectionsService,
  ) {
    super();
  }

  ngOnInit(): void {
    super.ngOnInit();
    this.connectionType = this._connections.currentConnection.type;

    if (this.value) {
      this.value = true;
    } else if (this.value === 0 || this.value === '' || this.value === false) {
      this.value = false;
    } else {
      this.value = null;
    }

    this.onFieldChange.emit(this.value);

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

  onToggleChange(optionValue: boolean): void {
    if (this.value === optionValue) {
      this.value = null;
    } else {
      this.value = optionValue;
    }
    this.onFieldChange.emit(this.value);
  }
}