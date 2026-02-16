import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSpinner } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TableForeignKey } from 'src/app/models/table';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TablesService } from 'src/app/services/tables.service';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

interface FetchTableResponse {
	rows: Record<string, unknown>[];
	primaryColumns: { column_name: string; data_type: string }[];
	identity_column?: string;
}

interface Suggestion {
	displayString: string;
	primaryKeys?: Record<string, unknown>;
	fieldValue?: unknown;
}

@Component({
	selector: 'app-edit-foreign-key',
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
		RouterModule,
	],
})
export class ForeignKeyEditComponent extends BaseEditFieldComponent {
	@Input() value;

	public connectionID: string;
	public currentDisplayedString: string;
	public currentFieldValue: unknown;
	public currentFieldQueryParams: Record<string, unknown>;
	public suggestions = signal<Suggestion[]>([]);
	public fetching = signal(true);
	public identityColumn: string;
	public primaeyKeys: { data_type: string; column_name: string }[];

	public fkRelations: TableForeignKey = null;
	private _debounceTimer: ReturnType<typeof setTimeout>;

	constructor(
		private _tables: TablesService,
		private _connections: ConnectionsService,
	) {
		super();
	}

	async ngOnInit(): Promise<void> {
		super.ngOnInit();
		this.connectionID = this._connections.currentConnectionID;

		if (this.widgetStructure?.widget_params) {
			this.fkRelations = this.widgetStructure.widget_params as TableForeignKey;
		} else if (this.relations) {
			this.fkRelations = this.relations;
		}

		if (this.fkRelations) {
			try {
				const res = (await firstValueFrom(
					this._tables.fetchTable({
						connectionID: this.connectionID,
						tableName: this.fkRelations.referenced_table_name,
						requstedPage: 1,
						chunkSize: 10,
						foreignKeyRowName: this.fkRelations.referenced_column_name,
						foreignKeyRowValue: this.value,
					}),
				)) as FetchTableResponse;

				if (res.rows.length) {
					this.identityColumn = res.identity_column;
					const modifiedRow = this.getModifiedRow(res.rows[0]);
					if (this.value) {
						this.currentDisplayedString = this.identityColumn
							? `${res.rows[0][this.identityColumn]} (${Object.values(modifiedRow)
									.filter((value) => value)
									.join(' | ')})`
							: Object.values(modifiedRow)
									.filter((value) => value)
									.join(' | ');
						this.currentFieldValue = res.rows[0][this.fkRelations.referenced_column_name];
						this.currentFieldQueryParams = Object.assign(
							{},
							...res.primaryColumns.map((primaeyKey) => ({
								[primaeyKey.column_name]: res.rows[0][primaeyKey.column_name],
							})),
						);
						this.onFieldChange.emit(this.currentFieldValue);
					}
				}

				const suggestionsRes = (await firstValueFrom(
					this._tables.fetchTable({
						connectionID: this.connectionID,
						tableName: this.fkRelations.referenced_table_name,
						requstedPage: 1,
						chunkSize: 20,
						foreignKeyRowName: 'autocomplete',
						foreignKeyRowValue: '',
						referencedColumn: this.fkRelations.referenced_column_name,
					}),
				)) as FetchTableResponse;

				this.identityColumn = suggestionsRes.identity_column;
				this.suggestions.set(
					suggestionsRes.rows.map((row) => {
						const modifiedRow = this.getModifiedRow(row);
						return {
							displayString: this.identityColumn
								? `${row[this.identityColumn]} (${Object.values(modifiedRow)
										.filter((value) => value)
										.join(' | ')})`
								: Object.values(modifiedRow)
										.filter((value) => value)
										.join(' | '),
							primaryKeys: Object.assign(
								{},
								...suggestionsRes.primaryColumns.map((primaeyKey) => ({
									[primaeyKey.column_name]: row[primaeyKey.column_name],
								})),
							),
							fieldValue: row[this.fkRelations.referenced_column_name],
						};
					}),
				);
				this.fetching.set(false);
			} catch (error) {
				console.error('Error loading foreign key data:', error);
				this.fetching.set(false);
			}
		}
	}

	onSearchInput(): void {
		clearTimeout(this._debounceTimer);
		this._debounceTimer = setTimeout(() => {
			if (this.currentDisplayedString === '') this.onFieldChange.emit(null);
			this.fetchSuggestions();
		}, 500);
	}

	async fetchSuggestions(): Promise<void> {
		const currentRow = this.suggestions()?.find(
			(suggestion) => suggestion.displayString === this.currentDisplayedString,
		);
		if (currentRow !== undefined) {
			this.currentFieldValue = currentRow.fieldValue;
			this.onFieldChange.emit(this.currentFieldValue);
		} else {
			this.fetching.set(true);
			try {
				const res = (await firstValueFrom(
					this._tables.fetchTable({
						connectionID: this.connectionID,
						tableName: this.fkRelations.referenced_table_name,
						requstedPage: 1,
						chunkSize: 20,
						foreignKeyRowName: 'autocomplete',
						foreignKeyRowValue: this.currentDisplayedString,
						referencedColumn: this.fkRelations.referenced_column_name,
					}),
				)) as FetchTableResponse;

				this.identityColumn = res.identity_column;
				if (res.rows.length === 0) {
					this.suggestions.set([
						{
							displayString: `No field starts with "${this.currentDisplayedString}" in foreign entity.`,
						},
					]);
				} else {
					this.suggestions.set(
						res.rows.map((row) => {
							const modifiedRow = this.getModifiedRow(row);
							return {
								displayString: this.identityColumn
									? `${row[this.identityColumn]} (${Object.values(modifiedRow)
											.filter((value) => value)
											.join(' | ')})`
									: Object.values(modifiedRow)
											.filter((value) => value)
											.join(' | '),
								primaryKeys: Object.assign(
									{},
									...res.primaryColumns.map((primaeyKey) => ({
										[primaeyKey.column_name]: row[primaeyKey.column_name],
									})),
								),
								fieldValue: row[this.fkRelations.referenced_column_name],
							};
						}),
					);
				}
				this.fetching.set(false);
			} catch (error) {
				console.error('Error fetching suggestions:', error);
				this.fetching.set(false);
			}
		}
	}

	getModifiedRow(row: Record<string, unknown>): Record<string, unknown> {
		let modifiedRow: Record<string, unknown>;
		if (this.fkRelations.autocomplete_columns && this.fkRelations.autocomplete_columns.length > 0) {
			let autocompleteColumns = [...this.fkRelations.autocomplete_columns];
			if (this.identityColumn)
				autocompleteColumns.splice(this.fkRelations.autocomplete_columns.indexOf(this.identityColumn), 1);
			modifiedRow = autocompleteColumns.reduce<Record<string, unknown>>(
				(rowObject, columnName) => ((rowObject[columnName] = row[columnName]), rowObject),
				{},
			);
		} else {
			modifiedRow = Object.entries(row).reduce<Record<string, unknown>>((rowObject, [columnName, value]) => {
				if (value) {
					rowObject[columnName] = value;
				}
				return rowObject;
			}, {});
		}
		return modifiedRow;
	}

	updateRelatedLink(e: MatAutocompleteSelectedEvent) {
		this.currentFieldQueryParams = this.suggestions().find(
			(suggestion) => suggestion.displayString === e.option.value,
		).primaryKeys;
	}
}
