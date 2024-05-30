import { Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DBtype } from 'src/app/models/connection';
import { format } from 'date-fns'

@Component({
  selector: 'app-row-date-time',
  templateUrl: './date-time.component.html',
  styleUrls: ['./date-time.component.css']
})
export class DateTimeRowComponent extends BaseRowFieldComponent {
  @Input() value: string;

  static type = 'datetime';
  public date: string;
  public time: string;
  public connectionType: DBtype;

  constructor(
    private _connections: ConnectionsService
  ) {
    super();
  }

  ngOnInit(): void {
    super.ngOnInit();
    this.connectionType = this._connections.currentConnection.type;

    if (this.value) {
      const datetime = new Date(this.value);
      this.date = format(datetime, 'yyyy-MM-dd');
      this.time = format(datetime, 'HH:mm:ss');
    }
  }

  onDateChange() {
    if (!this.time) this.time = '00:00:00';

    let datetime = '';
    if (this.connectionType === DBtype.MySQL) {
      datetime = `${this.date} ${this.time}`;
    } else {
      datetime = `${this.date}T${this.time}Z`;
    }

    this.onFieldChange.emit(datetime);
  }

  onTimeChange() {
    let datetime = '';
    if (this.connectionType === DBtype.MySQL) {
      datetime = `${this.date} ${this.time}`;
    } else {
      datetime = `${this.date}T${this.time}Z`;
    }

    this.onFieldChange.emit(datetime);
  }
}
