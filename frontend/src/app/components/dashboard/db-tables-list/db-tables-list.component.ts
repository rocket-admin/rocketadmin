import { Component, Input } from '@angular/core';

import { CommonModule } from '@angular/common';
import { ContentLoaderComponent } from '../../ui-components/content-loader/content-loader.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { TableProperties } from 'src/app/models/table';
import { TableStateService } from 'src/app/services/table-state.service';

@Component({
  selector: 'app-db-tables-list',
  templateUrl: './db-tables-list.component.html',
  styleUrls: ['./db-tables-list.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatTooltipModule,
    RouterModule,
    ContentLoaderComponent
  ]
})
export class DbTablesListComponent {
  @Input() connectionID: string;
  @Input() connectionTitle: string;
  @Input() tables: TableProperties[];
  @Input() selectedTable: string;
  @Input() collapsed: boolean;

  public substringToSearch: string;
  public foundTables: TableProperties[];
  constructor(
    private _tableState: TableStateService,
  ) { }

  ngOnInit() {
    this.foundTables = this.tables;
  }

  searchSubstring() {
    this.foundTables = this.tables
      .filter(tableItem => tableItem.table.toLowerCase().includes(this.substringToSearch?.toLowerCase()) || (tableItem.display_name && tableItem.display_name.toLowerCase().includes(this.substringToSearch.toLowerCase())));
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
