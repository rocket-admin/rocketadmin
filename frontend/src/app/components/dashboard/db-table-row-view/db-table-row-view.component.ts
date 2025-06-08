import { ActivatedRoute, RouterModule } from '@angular/router';
import { Component, Input, OnInit } from '@angular/core';
import { TableRow, Widget } from 'src/app/models/table';

import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationsService } from 'src/app/services/notifications.service';
import { TableStateService } from 'src/app/services/table-state.service';
import { normalizeFieldName } from 'src/app/lib/normalize';

@Component({
  selector: 'app-db-table-row-view',
  templateUrl: './db-table-row-view.component.html',
  styleUrls: ['./db-table-row-view.component.css'],
  imports: [
    MatIconModule,
    MatButtonModule,
    ClipboardModule,
    MatTooltipModule,
    RouterModule,
    CommonModule
  ]
})
export class DbTableRowViewComponent implements OnInit {
  // @Input() structure: object[];
  // @Input() foreignKeys: object;
  // @Input() foreignKeysList: string[];
  // @Input() widgets: { string: Widget };
  // @Input() widgetsList: string[];
  @Input() activeFilters: object;

  public selectedRow: TableRow;
  public columns: {
    title: string;
    normalizedTitle: string;
  }[] = [];

  constructor(
    private _tableState: TableStateService,
    private _notifications: NotificationsService,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this._tableState.cast.subscribe((row) => {
      console.log('Row selected:', row);
      this.selectedRow = row;
      if (row.columnsOrder) {
        const columnsOrder = this.selectedRow.columnsOrder.length ? this.selectedRow.columnsOrder : Object.keys(this.selectedRow.record);
        this.columns = columnsOrder.map(column => {
          return {
            title: column,
            normalizedTitle: normalizeFieldName(column)
          }
        })
      }
    });
  }

  isForeignKey(columnName: string) {
    return this.selectedRow.foreignKeysList.includes(columnName);
  }

  getForeignKeyValue(field: string) {
    if (this.selectedRow) {
      const identityColumnName = Object.keys(this.selectedRow.record[field]).find(key => key !== this.selectedRow.foreignKeys[field].referenced_column_name);
      if (identityColumnName) {
        return this.selectedRow.record[field][identityColumnName];
      } else {
        // const referencedColumnName = this.selectedRow.foreignKeys[field].referenced_column_name;
        return this.selectedRow.record[field];
      }
    };
    return '';
  }

  isWidget(columnName: string) {
    return this.selectedRow.widgetsList.includes(columnName);
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

  stashUrlParams() {
    this._tableState.setBackUrlParams(this.route.snapshot.queryParams.page_index, this.route.snapshot.queryParams.page_size, this.route.snapshot.queryParams.sort_active, this.route.snapshot.queryParams.sort_direction);
    if (this.activeFilters && Object.keys(this.activeFilters).length > 0) {
      this._tableState.setBackUrlFilters(this.activeFilters);
    } else {
      this._tableState.setBackUrlFilters(null);
    }
  }

  handleClose() {
    this._tableState.clearSelection();
  }
}
