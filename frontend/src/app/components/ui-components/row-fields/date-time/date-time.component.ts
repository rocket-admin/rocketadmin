import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { format } from 'date-fns'
import { normalizeFieldName } from '../../../../lib/normalize';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DBtype } from 'src/app/models/connection';

@Component({
  selector: 'app-row-date-time',
  templateUrl: './date-time.component.html',
  styleUrls: ['./date-time.component.css']
})
export class DateTimeRowComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() disabled: boolean;

  @Output() onFieldChange = new EventEmitter();

  static type = 'datetime';
  public date: string;
  public time: string;
  public normalizedLabel: string;
  private connectionType: DBtype;

  constructor(
    private _connections: ConnectionsService
  ) {
  }

  ngOnInit(): void {
    this.connectionType = this._connections.currentConnection.type;

    if (this.value) {
      const datetime = new Date(this.value);
      this.date = format(datetime, 'yyyy-MM-dd');
      this.time = format(datetime, 'HH:mm:ss');
    }

    this.normalizedLabel = normalizeFieldName(this.label);
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
