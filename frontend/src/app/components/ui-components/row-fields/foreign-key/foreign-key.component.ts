import { Component, Input } from '@angular/core';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { CommonModule } from '@angular/common';
import { ConnectionsService } from 'src/app/services/connections.service';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSpinner } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { TablesService } from 'src/app/services/tables.service';
import { RouterModule } from '@angular/router';

interface Suggestion {
  displayString: string;
  primaryKeys?: any;
  fieldValue?: any
}

@Component({
  selector: 'app-row-foreign-key',
  templateUrl: './foreign-key.component.html',
  styleUrls: ['./foreign-key.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatTooltipModule,
    MatSpinner,
    RouterModule
  ]
})
export class ForeignKeyRowComponent extends BaseRowFieldComponent {
  @Input() value;

  public connectionID: string;
  public currentDisplayedString: string;
  public currentFieldValue: any;
  public currentFieldQueryParams: any;
  public suggestions: Suggestion[];
  public fetching: boolean = true;
  public identityColumn: string;
  public primaeyKeys: {data_type: string, column_name: string}[];

  autocmpleteUpdate = new Subject<string>();

  constructor(
    private _tables: TablesService,
    private _connections: ConnectionsService,
  ) {
    super();
    this.autocmpleteUpdate.pipe(
      debounceTime(500),
      distinctUntilChanged())
      .subscribe(value => {
        if (this.currentDisplayedString === '') this.onFieldChange.emit(null);
        this.fetchSuggestions();
      });
  }

  ngOnInit(): void {
    super.ngOnInit();
    this.connectionID = this._connections.currentConnectionID;
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
          // this.primaeyKeys = res.primaryColumns;
          const modifiedRow = this.getModifiedRow(res.rows[0]);
          if (this.value) {
            this.currentDisplayedString =
              this.identityColumn ?
                `${res.rows[0][this.identityColumn]} (${Object.values(modifiedRow).filter(value => value).join(' | ')})` :
                Object.values(modifiedRow).filter(value => value).join(' | ');
              console.log('test identityColumn');
              console.log(this.currentDisplayedString);
              this.currentFieldValue = res.rows[0][this.relations.referenced_column_name];
            this.currentFieldQueryParams = Object.assign({}, ...res.primaryColumns.map((primaeyKey) => ({[primaeyKey.column_name]: res.rows[0][primaeyKey.column_name]})));
            this.onFieldChange.emit(this.currentFieldValue);
          }
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
                primaryKeys: Object.assign({}, ...res.primaryColumns.map((primaeyKey) => ({[primaeyKey.column_name]: row[primaeyKey.column_name]}))),
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
      // this.currentFieldQueryParams = Object.assign({}, ...this.primaeyKeys.map((primaeyKey) => ({[primaeyKey.column_name]: currentRow[primaeyKey.column_name]})));
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
            displayString: `No field starts with "${this.currentDisplayedString}" in foreign entity.`
          }]
        } else {
          this.suggestions = res.rows.map(row => {
            const modifiedRow = this.getModifiedRow(row);
            return {
              displayString: this.identityColumn ? `${row[this.identityColumn]} (${Object.values(modifiedRow).filter(value => value).join(' | ')})` : Object.values(modifiedRow).filter(value => value).join(' | '),
              primaryKeys: Object.assign({}, ...res.primaryColumns.map((primaeyKey) => ({[primaeyKey.column_name]: row[primaeyKey.column_name]}))),
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

  updateRelatedLink(e: MatAutocompleteSelectedEvent) {
    this.currentFieldQueryParams = this.suggestions.find(suggestion => suggestion.displayString === e.option.value).primaryKeys;
  }
}
