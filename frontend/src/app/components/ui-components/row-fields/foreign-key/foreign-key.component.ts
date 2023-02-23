import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TableForeignKey } from 'src/app/models/table';
import { ConnectionsService } from 'src/app/services/connections.service';
import { Subject } from 'rxjs';
import { TablesService } from 'src/app/services/tables.service';
import { normalizeFieldName } from '../../../../lib/normalize';

interface Suggestion {
  displayString: string;
  fieldValue?: any
}

@Component({
  selector: 'app-foreign-key',
  templateUrl: './foreign-key.component.html',
  styleUrls: ['./foreign-key.component.css']
})
export class ForeignKeyComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value;
  @Input() relations: TableForeignKey;
  @Input() required: boolean;
  @Input() readonly: boolean;

  @Output() onFieldChange = new EventEmitter();

  public connectionID: string;
  public currentDisplayedString: string;
  public currentFieldValue: any;
  public suggestions: Suggestion[];
  public fetching: boolean = true;
  public normalizedLabel: string;
  public identityColumn: string;

  autocmpleteUpdate =new Subject<string>();

  constructor(
    private _tables: TablesService,
    private _connections: ConnectionsService,
  ) {
    this.autocmpleteUpdate.pipe(
      debounceTime(500),
      distinctUntilChanged())
      .subscribe(value => {
        this.fetchSuggestions();
      });
   }

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this.normalizedLabel = normalizeFieldName(this.label);

    this.relations && this._tables.fetchTable({
        connectionID: this.connectionID,
        tableName: this.relations.referenced_table_name,
        requstedPage: 1,
        chunkSize: 10,
        foreignKeyRowName: this.relations.referenced_column_name,
        foreignKeyRowValue: this.value
      }).subscribe((res: any) => {
        if (res.rows.length) {
          this.identityColumn = res.identity_column;
          const modifiedRow = this.getModifiedRow(res.rows[0]);
          this.currentDisplayedString =
            this.identityColumn ?
              `${res.rows[0][this.identityColumn]} (${Object.values(modifiedRow).filter(value => value).join(' | ')})` :
              Object.values(modifiedRow).filter(value => value).join(' | ');
          this.currentFieldValue = res.rows[0][this.relations.referenced_column_name];
          this.onFieldChange.emit(this.currentFieldValue);
        }

        this._tables.fetchTable({
          connectionID: this.connectionID,
          tableName: this.relations.referenced_table_name,
          requstedPage: 1,
          chunkSize: 20,
          foreignKeyRowName: 'autocomplete',
          foreignKeyRowValue: '',
          referencedColumn: this.relations.referenced_column_name
          }).subscribe((res:any) => {
            this.identityColumn = res.identity_column;
            this.suggestions = res.rows.map(row => {
              const modifiedRow = this.getModifiedRow(row);
              return {
                displayString: this.identityColumn ? `${row[this.identityColumn]} (${Object.values(modifiedRow).filter(value => value).join(' | ')})` : Object.values(modifiedRow).filter(value => value).join(' | '),
                fieldValue: row[this.relations.referenced_column_name]
              }
            });
            this.fetching = false;
          });
      });
  }

  fetchSuggestions() {
    const currentRow = this.suggestions.find(suggestion => suggestion.displayString === this.currentDisplayedString);

    if (currentRow !== undefined) {
      this.currentFieldValue = currentRow.fieldValue;
      this.onFieldChange.emit(this.currentFieldValue);
    } else {
      this.fetching = true;
      this._tables.fetchTable({
        connectionID: this.connectionID,
        tableName: this.relations.referenced_table_name,
        requstedPage: 1,
        chunkSize: 20,
        foreignKeyRowName: 'autocomplete',
        foreignKeyRowValue: this.currentDisplayedString,
        referencedColumn: this.relations.referenced_column_name
      }).subscribe((res: any) => {
        this.identityColumn = res.identity_column;
        if (res.rows.length === 0) {
          this.suggestions = [{
            displayString: 'No matches'
          }]
        } else {
          this.suggestions = res.rows.map(row => {
            const modifiedRow = this.getModifiedRow(row);
            return {
              displayString: this.identityColumn ? `${row[this.identityColumn]} (${Object.values(modifiedRow).filter(value => value).join(' | ')})` : Object.values(modifiedRow).filter(value => value).join(' | '),
              fieldValue: row[this.relations.referenced_column_name]
            }
          });
        }
        this.fetching = false;
      });
    }
  }

  getModifiedRow(row) {
    let modifiedRow;
    if (this.relations.autocomplete_columns && this.relations.autocomplete_columns.length > 0) {
      let autocompleteColumns = [...this.relations.autocomplete_columns]
      if (this.identityColumn) autocompleteColumns.splice(this.relations.autocomplete_columns.indexOf(this.identityColumn), 1);
      modifiedRow = autocompleteColumns
        .reduce((rowObject, columnName)=> (rowObject[columnName]=row[columnName],rowObject),{});
    } else {
      modifiedRow = Object.entries(row).reduce((rowObject, [columnName, value]) => {
        if (value) {
          rowObject[columnName] = value;
        }
        return rowObject;
      }, {})
    }
    return modifiedRow;
  }

  // {
  //   "referenced_column_name": "Id",
  //   "referenced_table_name": "Customers",
  //   "constraint_name": "Orders_ibfk_2",
  //   "column_name": "CustomerId",
  //    autocomplete_columns
  // }

}
