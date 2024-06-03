import { Component, Input, OnInit } from '@angular/core';
import { TableRow } from 'src/app/models/table';
import { NotificationsService } from 'src/app/services/notifications.service';
import { TableStateService } from 'src/app/services/table-state.service';

@Component({
  selector: 'app-db-table-row-view',
  templateUrl: './db-table-row-view.component.html',
  styleUrls: ['./db-table-row-view.component.css']
})
export class DbTableRowViewComponent implements OnInit {
  @Input() columns: object[];
  @Input() foreignKeys: object;
  @Input() foreignKeysList: string[];

  public selectedRow: TableRow;

  constructor(
    private _tableState: TableStateService,
    private _notifications: NotificationsService,
  ) { }

  ngOnInit(): void {
    this._tableState.cast.subscribe((row) => {
      this.selectedRow = row;
    });
  }

  isForeignKey(columnName: string) {
    return this.foreignKeysList.includes(columnName);
  }

  getForeignKeyValue(field: string) {
    if (this.selectedRow) {
      const identityColumnName = Object.keys(this.selectedRow.record[field]).find(key => key !== this.foreignKeys[field].referenced_column_name);
      if (identityColumnName) {
        return this.selectedRow.record[field][identityColumnName];
      } else {
        const referencedColumnName = this.foreignKeys[field].referenced_column_name;
        return this.selectedRow.record[field][referencedColumnName];
      }
    };
    return '';
  }

  getDedicatedPageLink() {
    if (this.selectedRow) {
      const params = new URLSearchParams();
      for (const key in this.selectedRow.primaryKeys) {
        if (this.selectedRow.primaryKeys.hasOwnProperty(key)) {
          params.append(key, this.selectedRow.primaryKeys[key]);
        }
      }
      return `${location.origin}${this.selectedRow.link}?${params.toString()}`;
    };
    return '';
  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }

  handleClose() {
    this._tableState.clearSelection();
  }
}
