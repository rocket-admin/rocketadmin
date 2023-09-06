import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { TableField, TableOrdering, TableSettings } from 'src/app/models/table';

import { ConnectionsService } from 'src/app/services/connections.service';
import { Location } from '@angular/common';
import { FormControl, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { TablesService } from 'src/app/services/tables.service';
import { Title } from '@angular/platform-browser';
import { normalizeTableName } from 'src/app/lib/normalize';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import { Observable } from 'rxjs';
import {map, startWith} from 'rxjs/operators';

@Component({
  selector: 'app-db-table-settings',
  templateUrl: './db-table-settings.component.html',
  styleUrls: ['./db-table-settings.component.css']
})
export class DbTableSettingsComponent implements OnInit {

  public connectionID: string | null = null;
  public tableName: string | null = null;
  public displayTableName: string | null = null;
  public submitting: boolean = false;
  public isSettingsExist: boolean = false;
  public loading: boolean = true;
  public fields: string[] = [];
  public fields_to_exclude: string[];
  public orderChanged: boolean;
  public iconChanged: boolean = false;
  public listFieldsOrder: string[];
  public tableSettings: TableSettings = {
    connection_id: '',
    table_name: '',
    icon: '',
    display_name: '',
    autocomplete_columns: [],
    identity_column: '',
    search_fields: [],
    excluded_fields: [],
    list_fields: [],
    ordering: TableOrdering.Ascending,
    ordering_field: '',
    readonly_fields: [],
    sortable_by: [],
    columns_view: [],
    sensitive_fields: []
  };
  public defaultIcons = ['favorite', 'star', 'done', 'arrow_forward', 'key', 'lock', 'visibility', 'language', 'notifications', 'schedule'];
  public sensitiveFieldsCtrl = new FormControl();
  separatorKeysCodes: number[] = [ENTER, COMMA];
  filteredSensitiveFields: Observable<string[]>;

  @ViewChild('sensitivefieldsInput') sensitivefieldsInput: ElementRef<HTMLInputElement>;
  @ViewChild('autocompleteTrigger') matACTrigger: MatAutocompleteTrigger;

  constructor(
    private _tables: TablesService,
    private _connections: ConnectionsService,
    private _location: Location,
    public router: Router,
    private title: Title,
  ) {
    this.filteredSensitiveFields = this.sensitiveFieldsCtrl.valueChanges.pipe(
      startWith(null),
      map((fruit: string | null) => fruit ? this._filter(fruit) : this.fields.slice()));
  }

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this.tableName = this._tables.currentTableName;
    this.displayTableName = normalizeTableName(this.tableName);
    this._tables.cast.subscribe();
    this._tables.fetchTableStructure(this.connectionID, this.tableName)
      .subscribe(res => {
        const primaryKeys = res.primaryColumns.map(primaryColumn => primaryColumn.column_name);
        this.fields = res.structure.map((field: TableField) => field.column_name);
        this.fields_to_exclude = this.fields.filter((field) => !primaryKeys.includes(field));
        this.getTableSettings();
      });
  }

  get currentConnection() {
    return this._connections.currentConnection;
  }

  getCrumbs(name: string) {
    return [
      {
        label: name,
        link: `/dashboard/${this.connectionID}`
      },
      {
        label: this.tableSettings.display_name || this.displayTableName,
        link: `/dashboard/${this.connectionID}/${this.tableName}`
      },
      {
        label: 'Settings',
        link: null
      }
    ]
  }

  goBack() {
    this._location.back();
  }

  getTableSettings() {
    this._tables.fetchTableSettings(this.connectionID, this.tableName)
      .subscribe(res => {
        this.loading = false;
        if (Object.keys(res).length !== 0) {
          this.isSettingsExist = true
          this.tableSettings = res;
          console.log(res);
          this.listFieldsOrder = [...res.list_fields];
        };
        if (Object.keys(res).length === 0 || (res && res.list_fields && !res.list_fields.length)) {
          this.listFieldsOrder = [...this.fields];
        };
        this.title.setTitle(`${res.display_name || this.displayTableName} - Table settings | Rocketadmin`);
      }
    );
  }

  updateIcon(icon: string) {
    this.tableSettings.icon = icon;
    this.iconChanged = true;
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.listFieldsOrder, event.previousIndex, event.currentIndex);
    this.tableSettings.list_fields = [...this.listFieldsOrder];
    this.orderChanged = true;
  }

  resetColumnsOrder() {
    this.tableSettings.list_fields = [];
    this.listFieldsOrder = [...this.fields];
    this.orderChanged = true;
  }

  add(event: MatChipInputEvent, sttingsName: string): void {
    const input = event.input;
    const value = event.value;

    // Add our fruit
    if ((value || '').trim()) {
      this.tableSettings[sttingsName].push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }

    this.sensitiveFieldsCtrl.setValue(null);
  }

  remove(field: string, sttingsName: string): void {
    const index = this.tableSettings[sttingsName].indexOf(field);

    if (index >= 0) {
      this.tableSettings[sttingsName].splice(index, 1);
    }
  }

  selected(event: MatAutocompleteSelectedEvent, sttingsName: string): void {
    const newValue = event.option.viewValue;
    if (this.tableSettings[sttingsName].includes(newValue)) {
      this.tableSettings[sttingsName] = [...this.tableSettings[sttingsName].filter(fruit=>fruit !== newValue)];
    } else {
      this.tableSettings[sttingsName].push(event.option.viewValue);
    }
    this.sensitivefieldsInput.nativeElement.value = '';
    this.sensitiveFieldsCtrl.setValue(null);

    // keep the autocomplete opened after each item is picked.
    requestAnimationFrame(()=>{
      this.openAuto(this.matACTrigger);
    })

  }

  openAuto(trigger: MatAutocompleteTrigger) {
    trigger.openPanel();
    this.sensitivefieldsInput.nativeElement.focus();
    console.log(trigger);
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.fields.filter(field => field.toLowerCase().indexOf(filterValue) >= 0);
  }

  updateSettings() {
    this.submitting = true;
    this.tableSettings.connection_id =  this.connectionID;
    this.tableSettings.table_name =  this.tableName;

    this._tables.updateTableSettings(this.isSettingsExist, this.connectionID, this.tableName, this.tableSettings)
      .subscribe(() => {
        this.submitting = false;
        this.router.navigate([`/dashboard/${this.connectionID}/${this.tableName}`]);
      },
      () => { },
      () => { this.submitting = false; }
    );
  }

  resetSettings(form: NgForm) {
    this.submitting = true;
    this._tables.deleteTableSettings(this.connectionID, this.tableName)
      .subscribe(() => {
        form.reset();
        this.submitting = false;
      },
        () => { },
        () => { this.submitting = false; }
      )
  }
}
