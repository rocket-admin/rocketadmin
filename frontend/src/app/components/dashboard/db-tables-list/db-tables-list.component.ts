import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TableProperties } from 'src/app/models/table';

@Component({
  selector: 'app-db-tables-list',
  templateUrl: './db-tables-list.component.html',
  styleUrls: ['./db-tables-list.component.css']
})
export class DbTablesListComponent {
  @Input() connectionID: string;
  @Input() tables: TableProperties[];

  public searchString: string;
  public foundTables: TableProperties[];
  constructor() { }

  ngOnInit() {
    this.foundTables = this.tables;
  }

  serach() {
    this.foundTables = this.tables.filter(tableItem => tableItem.table.toLowerCase().includes(this.searchString.toLowerCase()) || (tableItem.display_name && tableItem.display_name.toLowerCase().includes(this.searchString.toLowerCase())));
    console.log(this.tables);
    console.log(this.foundTables);
  }
}
