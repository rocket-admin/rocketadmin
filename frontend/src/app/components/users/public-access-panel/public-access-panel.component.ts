import { Component, computed, DestroyRef, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import posthog from 'posthog-js';
import { normalizeTableName } from 'src/app/lib/normalize';
import { PublicTablePermission } from 'src/app/models/user';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TablesService } from 'src/app/services/tables.service';
import { UsersService } from 'src/app/services/users.service';
import { ContentLoaderComponent } from '../../ui-components/content-loader/content-loader.component';

interface PublicAccessTable {
	tableName: string;
	displayName: string;
}

// A selected table maps to its readable-column whitelist. An empty array means "all columns",
// matching the backend contract where an omitted/empty readableColumns grants every column.
type TableSelection = Map<string, string[]>;

@Component({
	selector: 'app-public-access-panel',
	imports: [
		MatButtonModule,
		MatCheckboxModule,
		MatExpansionModule,
		MatFormFieldModule,
		MatIconModule,
		MatSelectModule,
		MatTooltipModule,
		ContentLoaderComponent,
	],
	templateUrl: './public-access-panel.component.html',
	styleUrls: ['./public-access-panel.component.css'],
})
export class PublicAccessPanelComponent implements OnInit {
	private _usersService = inject(UsersService);
	private _tablesService = inject(TablesService);
	private _connections = inject(ConnectionsService);
	private _destroyRef = inject(DestroyRef);

	protected posthog = posthog;
	protected connectionID: string;

	protected publicPermissions = this._usersService.publicPermissions;
	protected loadingPermissions = this._usersService.publicPermissionsLoading;

	protected tables = signal<PublicAccessTable[]>([]);
	protected tablesLoading = signal(true);
	protected submitting = signal(false);

	protected selection = signal<TableSelection>(new Map());
	protected columnsByTable = signal<Record<string, string[]>>({});
	protected loadingColumns = signal<Set<string>>(new Set());

	protected selectedCount = computed(() => this.selection().size);

	protected statusLabel = computed(() => {
		const count = this.selectedCount();
		if (count === 0) return 'Disabled';
		return `${count} ${count === 1 ? 'table' : 'tables'}`;
	});

	// Public access is stored server-side as a derived value: a non-empty table list means
	// enabled. `Disable public access` is only meaningful once something is actually stored.
	protected canDisable = computed(() => this.publicPermissions().enabled);

	constructor() {
		// Seed the local editing state whenever the server state (re)loads, so an external change
		// to public access is picked up. Editing is blocked while a save is in flight (see the
		// submitting() bindings in the template), which is the only window where this re-seed
		// could otherwise discard an unsaved edit.
		effect(() => {
			const stored = this.publicPermissions().tables;
			const seeded: TableSelection = new Map();
			for (const table of stored) {
				seeded.set(table.tableName, table.readableColumns ?? []);
			}
			this.selection.set(seeded);

			// Every already-public table needs its columns, not just the restricted ones: an
			// unrestricted table still renders the column picker, which would otherwise be empty.
			// Kept untracked: _loadColumns both reads and writes the column signals, so tracking it
			// would make a finished column fetch re-run this effect and clobber edits made meanwhile.
			untracked(() => {
				for (const table of stored) {
					this._loadColumns(table.tableName);
				}
			});
		});
	}

	ngOnInit(): void {
		this.connectionID = this._connections.currentConnectionID;
		this._usersService.loadPublicPermissions(this.connectionID);

		// fetchTables does not swallow errors, so clear the loading state on failure too —
		// otherwise the panel body is stuck on the content loader forever.
		this._tablesService
			.fetchTables(this.connectionID)
			.pipe(takeUntilDestroyed(this._destroyRef))
			.subscribe({
				next: (tables) => {
					this.tables.set(
						tables.map((t) => ({
							tableName: t.table,
							displayName: t.display_name || normalizeTableName(t.table),
						})),
					);
					this.tablesLoading.set(false);
				},
				error: () => this.tablesLoading.set(false),
			});
	}

	isSelected(tableName: string): boolean {
		return this.selection().has(tableName);
	}

	selectedColumns(tableName: string): string[] {
		return this.selection().get(tableName) ?? [];
	}

	availableColumns(tableName: string): string[] {
		return this.columnsByTable()[tableName] ?? [];
	}

	isLoadingColumns(tableName: string): boolean {
		return this.loadingColumns().has(tableName);
	}

	toggleTable(tableName: string, selected: boolean): void {
		this.selection.update((current) => {
			const next = new Map(current);
			if (selected) {
				next.set(tableName, []);
			} else {
				next.delete(tableName);
			}
			return next;
		});
		if (selected) {
			this._loadColumns(tableName);
		}
	}

	setColumns(tableName: string, columns: string[]): void {
		this.selection.update((current) => {
			const next = new Map(current);
			next.set(tableName, columns);
			return next;
		});
	}

	async save(): Promise<void> {
		this.submitting.set(true);
		try {
			await this._usersService.savePublicPermissions(this.connectionID, this._buildPayload());
		} finally {
			this.submitting.set(false);
		}
	}

	async disablePublicAccess(): Promise<void> {
		this.submitting.set(true);
		try {
			await this._usersService.savePublicPermissions(this.connectionID, []);
			this.selection.set(new Map());
		} finally {
			this.submitting.set(false);
		}
	}

	private _buildPayload(): PublicTablePermission[] {
		return [...this.selection().entries()].map(([tableName, columns]) => ({
			tableName,
			readableColumns: columns.length ? columns : undefined,
		}));
	}

	private _loadColumns(tableName: string): void {
		if (this.columnsByTable()[tableName] || this.loadingColumns().has(tableName)) return;

		this.loadingColumns.update((current) => new Set(current).add(tableName));
		this._tablesService
			.fetchTableStructure(this.connectionID, tableName)
			.pipe(takeUntilDestroyed(this._destroyRef))
			.subscribe({
				next: (res) => {
					this.columnsByTable.update((current) => ({
						...current,
						[tableName]: (res?.structure ?? []).map((field: { column_name: string }) => field.column_name),
					}));
					this._clearLoadingColumn(tableName);
				},
				error: () => this._clearLoadingColumn(tableName),
			});
	}

	private _clearLoadingColumn(tableName: string): void {
		this.loadingColumns.update((current) => {
			const next = new Set(current);
			next.delete(tableName);
			return next;
		});
	}
}
