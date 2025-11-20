import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { CommonModule } from '@angular/common';
import { Component, Inject, Input, OnInit, AfterViewInit, ElementRef } from '@angular/core';
import { DynamicModule } from 'ng-dynamic-component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { ContentLoaderComponent } from 'src/app/components/ui-components/content-loader/content-loader.component';
import { Observable, map, startWith } from 'rxjs';
import { TablesService } from 'src/app/services/tables.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { filterTypes } from 'src/app/consts/filter-types';
import { UIwidgets } from 'src/app/consts/record-edit-types';
import { TableField, TableForeignKey } from 'src/app/models/table';
import { getTableTypes } from 'src/app/lib/setup-table-row-structure';
import { omitBy } from 'lodash';
import { Angulartics2, Angulartics2OnModule } from 'angulartics2';

@Component({
  selector: 'app-saved-filters-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    DynamicModule,
    RouterModule,
    MatDialogModule,
    MatSnackBarModule,
    ContentLoaderComponent,
    Angulartics2OnModule
  ],
  templateUrl: './saved-filters-dialog.component.html',
  styleUrl: './saved-filters-dialog.component.css'
})
export class SavedFiltersDialogComponent implements OnInit, AfterViewInit {
  // @Input() connectionID: string;
  // @Input() tableName: string;
  // @Input() displayTableName: string;
  // @Input() filtersSet: any;

  public tableFilters = [];
  public fieldSearchControl = new FormControl('');
  public fields: string[];
  public foundFields: Observable<string[]>;

  public tableRowFields: Object;
  public tableRowStructure: Object;
  public tableRowFieldsShown: Object = {};
  public tableRowFieldsComparator: Object = {};
  // public tableForeignKeys: {[key: string]: TableForeignKey};
  public tableFiltersCount: number = 0;
  public tableTypes: Object;
  public tableWidgets: object;
  public tableWidgetsList: string[] = [];
  public UIwidgets = UIwidgets;
  public dynamicColumn: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _tables: TablesService,
    private _connections: ConnectionsService,
    private dialogRef: MatDialogRef<SavedFiltersDialogComponent>,
    private snackBar: MatSnackBar,
    private angulartics2: Angulartics2,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this._tables.cast.subscribe();

    if (this.data.filtersSet) {
      this.tableRowFieldsShown = Object.entries(this.data.filtersSet.filters).reduce((acc, [field, conditions]) => {
        const [comparator, value] = Object.entries(conditions)[0];
        acc[field] = value;
        return acc;
      }, {});

      this.tableRowFieldsComparator = Object.entries(this.data.filtersSet.filters).reduce((acc, [field, conditions]) => {
        const [comparator] = Object.keys(conditions);
        acc[field] = comparator;
        return acc;
      }, {});

      // Initialize dynamic column if it exists in the filters set
      if (this.data.filtersSet.dynamic_column && this.data.filtersSet.dynamic_column.column_name) {
        this.tableRowFieldsShown[this.data.filtersSet.dynamic_column.column_name] = null;
        this.tableRowFieldsComparator[this.data.filtersSet.dynamic_column.column_name] = this.data.filtersSet.dynamic_column.comparator || '';
        this.dynamicColumn = this.data.filtersSet.dynamic_column.column_name;
      }
    }

    // this.tableForeignKeys = {...this.data.structure.foreignKeys};
    this.tableRowFields = Object.assign({}, ...this.data.structure.map((field: TableField) => ({[field.column_name]: undefined})));
    const foreignKeysList = Object.keys(this.data.tableForeignKeys);
    this.tableTypes = getTableTypes(this.data.structure, foreignKeysList);
    this.fields = this.data.structure
      .filter((field: TableField) => this.getInputType(field.column_name) !== 'file')
      .map((field: TableField) => field.column_name);

    this.tableRowStructure = Object.assign({}, ...this.data.structure.map((field: TableField) => {
      return {[field.column_name]: field};
    }));

    // Setup widgets if available
    if (this.data.tableWidgets && this.data.tableWidgets.length) {
      this.setWidgets(this.data.tableWidgets);
    }

    this.foundFields = this.fieldSearchControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '')),
    );
  }

  ngAfterViewInit(): void {
    // If editing an existing filter (has id), remove focus from the filter name input
    if (this.data.filtersSet && this.data.filtersSet.id) {
      setTimeout(() => {
        const nameInput = this.elementRef.nativeElement.querySelector('input[name="filters_set_name"]') as HTMLInputElement;
        if (nameInput && document.activeElement === nameInput) {
          nameInput.blur();
        }
      }, 100);
    }
  }

  private _filter(value: string): string[] {
    return this.fields.filter((field: string) => field.toLowerCase().includes(value.toLowerCase()));
  }

  get inputs() {
    return filterTypes[this._connections.currentConnection.type];
  }

  setWidgets(widgets: any[]) {
    this.tableWidgetsList = widgets.map((widget: any) => widget.field_name);
    this.tableWidgets = Object.assign({}, ...widgets
      .map((widget: any) => {
        let params;
        if (widget.widget_params !== '// No settings required') {
          try {
            params = JSON.parse(widget.widget_params);
          } catch (e) {
            params = '';
          }
        } else {
          params = '';
        }
        return {
          [widget.field_name]: {...widget, widget_params: params}
        };
      })
    );
  }

  trackByFn(index: number, item: any) {
    return item.key;
  }

  isWidget(columnName: string) {
    return this.tableWidgetsList.includes(columnName);
  }

  updateField = (updatedValue: any, field: string) => {
    this.tableRowFieldsShown[field] = updatedValue;
    this.updateFiltersCount();
  }

  addFilter(e) {
    const key = e.option.value;
    this.tableRowFieldsShown = {...this.tableRowFieldsShown, [key]: this.tableRowFields[key]};
    this.tableRowFieldsComparator = {...this.tableRowFieldsComparator, [key]: this.tableRowFieldsComparator[key] || 'eq'};
    this.fieldSearchControl.setValue('');
    this.updateFiltersCount();
  }

  updateComparator(event, fieldName: string) {
    console.log('Updating comparator for field:', fieldName, 'obj', this.tableRowFieldsComparator);
    if (event === 'empty') this.tableRowFieldsShown[fieldName] = '';
  }

  removeFilters() {
    this._tables.deleteSavedFilter(this.data.connectionID, this.data.tableName, this.data.filtersSet.id).subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error removing filters:', error);
        this.snackBar.open('Error removing filters', 'Close', { duration: 3000 });
      }
    });
  }

  getInputType(field: string) {
    let widgetType;
    if (this.isWidget(field)) {
      widgetType = this.UIwidgets[this.tableWidgets[field].widget_type]?.type;
    } else {
      widgetType = this.inputs[this.tableTypes[field]]?.type;
    }
    return widgetType;
  }

  getComparatorType(typeOfComponent) {
    if (typeOfComponent === 'text') {
      return 'text';
    } else if (typeOfComponent === 'number' || typeOfComponent === 'datetime') {
      return 'number';
    } else {
      return 'nonComparable';
    }
  }

  getOperatorIcon(operator: string): string {
    const iconMap: { [key: string]: string } = {
      'startswith': 'play_arrow',
      'endswith': 'play_arrow',
      'eq': 'drag_handle',
      'contains': 'search',
      'icontains': 'block',
      'empty': 'space_bar',
      'gt': 'keyboard_arrow_right',
      'lt': 'keyboard_arrow_left',
      'gte': 'keyboard_double_arrow_right',
      'lte': 'keyboard_double_arrow_left'
    };
    return iconMap[operator] || 'drag_handle';
  }

  removeFilter(field) {
    delete this.tableRowFieldsShown[field];
    delete this.tableRowFieldsComparator[field];
    if (this.dynamicColumn === field) {
      this.dynamicColumn = null;
    }
    this.updateFiltersCount();
  }

  updateFiltersCount() {
    this.tableFiltersCount = Object.keys(this.tableRowFieldsShown).length;
  }

  toggleDynamicColumn(field: string) {
    if (this.dynamicColumn === field) {
      this.dynamicColumn = null;
    } else {
      this.dynamicColumn = field;
    }
  }

  handleSaveFilters() {
    let payload;
    if (Object.keys(this.tableRowFieldsShown).length) {
      let filters = {};

      for (const key in this.tableRowFieldsShown) {
        // Skip fields that are marked as dynamic column
        if (key === this.dynamicColumn) {
          continue;
        }

        if (this.tableRowFieldsComparator[key] !== undefined) {
          // If value is empty or undefined, use null
          const value = this.tableRowFieldsShown[key] === '' || this.tableRowFieldsShown[key] === undefined ?
            null : this.tableRowFieldsShown[key];

          filters[key] = {
            [this.tableRowFieldsComparator[key]]: value
          };
        }
      }

      // const filters = JsonURL.stringify( this.filters );
      payload = {
        name: this.data.filtersSet.name,
        filters
      };

      // Only add dynamic_column if one is selected
      if (this.dynamicColumn) {
        // Create object with column_name and comparator properties
        payload['dynamic_column'] = {
          column_name: this.dynamicColumn,
          comparator: this.tableRowFieldsComparator[this.dynamicColumn] || ''
        };
      }

      if (this.data.filtersSet.id) {
        this._tables.updateSavedFilter(this.data.connectionID, this.data.tableName, this.data.filtersSet.id, payload)
          .subscribe(() => {
            this.dialogRef.close(true);
          }, (error) => {
            console.error('Error updating filter:', error);
            this.snackBar.open('Error updating filter', 'Close', { duration: 3000 });
          });
      } else {
        this._tables.createSavedFilter(this.data.connectionID, this.data.tableName, payload)
        .subscribe(() => {
          this.angulartics2.eventTrack.next({
            action: 'Saved filters: saved filter is created successfully',
          });
          this.dialogRef.close(true);
        }, (error) => {
          this.angulartics2.eventTrack.next({
            action: 'Saved filters: error creating saved filter',
          });
          console.error('Error saving filter:', error);
          this.snackBar.open('Error saving filter', 'Close', { duration: 3000 });
        });
      }
  }

  // saveFilter() {


  //     this._tables.createSavedFilter(this.data.connectionID, this.data.tableName, payload)
  //       .subscribe(() => {
  //         this.dialogRef.close(true);
  //       }, (error) => {
  //         console.error('Error saving filter:', error);
  //         this.snackBar.open('Error saving filter', 'Close', { duration: 3000 });
  //       });
  //   }
  }
}