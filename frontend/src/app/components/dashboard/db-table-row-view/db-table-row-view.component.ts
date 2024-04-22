import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NotificationsService } from 'src/app/services/notifications.service';

@Component({
  selector: 'app-db-table-row-view',
  templateUrl: './db-table-row-view.component.html',
  styleUrls: ['./db-table-row-view.component.css']
})
export class DbTableRowViewComponent {
  @Input() selectedRow: {
    row: object,
    link: string
    queryParams: object
  };
  @Input() columns: object[];
  @Input() foreignKeys: object;
  @Input() foreignKeysList: string[];
  @Output() close = new EventEmitter<void>();

  constructor(
    private _notifications: NotificationsService,
  ) { }

  isForeignKey(columnName: string) {
    return this.foreignKeysList.includes(columnName);
  }

  getForeignKeyValue(field: string) {
    if (this.selectedRow) {
      const identityColumnName = Object.keys(this.selectedRow.row[field]).find(key => key !== this.foreignKeys[field].referenced_column_name);
      if (identityColumnName) {
        return this.selectedRow.row[field][identityColumnName];
      } else {
        const referencedColumnName = this.foreignKeys[field].referenced_column_name;
        return this.selectedRow.row[field][referencedColumnName];
      }
    };
    return '';
  }

  getDedicatedPageLink() {
    if (this.selectedRow) {
      const params = new URLSearchParams();
      for (const key in this.selectedRow.queryParams) {
        if (this.selectedRow.queryParams.hasOwnProperty(key)) {
          params.append(key, this.selectedRow.queryParams[key]);
        }
      }
      return `${location.origin}${this.selectedRow.link}?${params.toString()}`;
    };
    return '';
  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }
}
