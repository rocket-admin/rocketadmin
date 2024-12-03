import { Component, Input } from '@angular/core';

import { TableProperties } from 'src/app/models/table';
import { TableStateService } from 'src/app/services/table-state.service';

@Component({
  selector: 'app-db-tables-list',
  templateUrl: './db-tables-list.component.html',
  styleUrls: ['./db-tables-list.component.css']
})
export class DbTablesListComponent {
  @Input() connectionID: string;
  @Input() connectionTitle: string;
  @Input() tables: TableProperties[];
  @Input() selectedTable: string;
  @Input() collapsed: boolean;

  public searchString: string;
  public foundTables: TableProperties[];
  constructor(
    private _tableState: TableStateService,
  ) { }

  ngOnInit() {
    this.foundTables = this.tables;
  }

  serach() {
    this.foundTables = this.tables
      .filter(tableItem => tableItem.table.toLowerCase().includes(this.searchString.toLowerCase()) || (tableItem.display_name && tableItem.display_name.toLowerCase().includes(this.searchString.toLowerCase())));
  }

  getTableName(table: TableProperties) {
    return table.display_name || table.normalizedTableName || table.table
  }

  getTableNameLength(tableName: string) {
    return tableName.length;
  }

  closeSidebar() {
    this._tableState.clearSelection();
    this._tableState.closeAIpanel();
  }
}
