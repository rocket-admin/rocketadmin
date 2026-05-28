import { TextFieldModule } from '@angular/cdk/text-field';
import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, inject, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Parser } from 'node-sql-parser';
import { SchemaChangeResponse, TableSchemaService } from 'src/app/services/table-schema.service';
import { SchemaDiagramViewerComponent } from './schema-diagram-viewer/schema-diagram-viewer.component';

interface ParsedColumn {
	name: string;
	type: string;
	pk: boolean;
	fk: boolean;
	referenceTable?: string;
	notNull: boolean;
	unique: boolean;
	defaultValue?: string;
}

interface ParsedChange {
	id: string;
	action: string;
	icon: string;
	tone: 'add' | 'edit' | 'remove';
	targetTableName: string;
	aiSummary?: string;
	columns: ParsedColumn[];
	forwardSql: string;
}

interface ChatMessage {
	role: 'user' | 'ai' | 'error' | 'diagram';
	text: string;
	diagramSource?: string;
	changes?: SchemaChangeResponse[];
	parsedChanges?: ParsedChange[];
	batchId?: string;
}

@Component({
	selector: 'app-edit-database-schema',
	templateUrl: './edit-database-schema.component.html',
	styleUrls: ['./edit-database-schema.component.css'],
	imports: [
		CommonModule,
		FormsModule,
		MatButtonModule,
		MatIconModule,
		MatFormFieldModule,
		MatInputModule,
		MatTooltipModule,
		TextFieldModule,
		RouterModule,
		SchemaDiagramViewerComponent,
	],
})
export class EditDatabaseSchemaComponent implements OnInit {
	@Input() connectionID: string;
	@Input() showClose: boolean = false;
	@Output() schemaApplied = new EventEmitter<void>();
	@Output() closeEditor = new EventEmitter<void>();

	private _tableSchema = inject(TableSchemaService);
	private _route = inject(ActivatedRoute);
	private _router = inject(Router);

	protected isRoutedPage = signal(false);
	protected messages = signal<ChatMessage[]>([]);
	protected userPrompt = signal('');
	protected submitting = signal(false);
	protected applying = signal(false);
	protected applied = signal(false);
	protected initialDiagramLoading = signal(false);
	private _threadId: string | undefined;

	protected pendingBatch = computed(() => {
		const msgs = this.messages();
		for (let i = msgs.length - 1; i >= 0; i--) {
			if (msgs[i].batchId && msgs[i].changes?.length) return msgs[i];
		}
		return null;
	});

	protected currentDiagram = computed(() => {
		const msgs = this.messages();
		for (let i = msgs.length - 1; i >= 0; i--) {
			if (msgs[i].role === 'diagram' && msgs[i].diagramSource) return msgs[i];
		}
		return null;
	});

	protected chatMessages = computed(() => this.messages().filter((m) => m.role !== 'diagram'));

	ngOnInit(): void {
		if (!this.connectionID) {
			const id = this._route.snapshot.paramMap.get('connection-id');
			if (id) {
				this.connectionID = id;
				this.isRoutedPage.set(true);
				this.showClose = false;
			} else {
				this._router.navigate(['/connections-list']);
				return;
			}
		}

		if (this.showClose || this.isRoutedPage()) {
			this._loadDiagram('Current Database Structure');
		}
	}

	async onSubmit() {
		const prompt = this.userPrompt().trim();
		if (!prompt || this.submitting()) return;

		this.messages.update((msgs) => [...msgs, { role: 'user', text: prompt }]);
		this.userPrompt.set('');
		this.submitting.set(true);

		try {
			const result = await this._tableSchema.generateSchemaChange(this.connectionID, prompt, this._threadId);
			if (result.threadId) {
				this._threadId = result.threadId;
			}
			if (result && result.changes.length > 0) {
				this.applied.set(false);
				let previewSource = '';
				try {
					const preview = await this._tableSchema.previewDiagram(
						this.connectionID,
						result.changes.map((c) => c.forwardSql),
					);
					previewSource = preview.diagram ?? '';
				} catch {
					// preview is supplementary — don't block the change list on a diagram failure
				}
				const parsedChanges = result.changes.map((c) => this._parseChange(c));
				this.messages.update((msgs) => {
					const next: ChatMessage[] = [
						...msgs,
						{
							role: 'ai',
							text: `I've generated ${result.changes.length} change(s) for your database. Review them below and approve or reject.`,
							changes: result.changes,
							parsedChanges,
							batchId: result.batchId,
						},
					];
					if (previewSource) {
						next.push({
							role: 'diagram',
							text: 'Schema Preview',
							diagramSource: '```mermaid\n' + previewSource + '\n```',
						});
					}
					return next;
				});
			} else {
				const clarification = result.assistantMessage?.trim();
				this.messages.update((msgs) => [
					...msgs,
					{
						role: 'ai',
						text:
							clarification ||
							'I could not generate any schema changes for that prompt. Could you describe your database in more detail?',
					},
				]);
			}
		} catch (err: unknown) {
			const error = err as { error?: { message?: string }; message?: string };
			this.messages.update((msgs) => [
				...msgs,
				{
					role: 'error',
					text: error?.error?.message || error?.message || 'Failed to generate schema changes.',
				},
			]);
		} finally {
			this.submitting.set(false);
		}
	}

	async onApprove() {
		const batch = this.pendingBatch();
		if (!batch?.batchId || this.applying()) return;

		this.applying.set(true);

		try {
			const result = await this._tableSchema.approveBatch(batch.batchId, true);
			if (result) {
				const failed = result.changes.filter((c) => c.status === 'failed');
				if (failed.length > 0) {
					this.messages.update((msgs) => [
						...msgs,
						{
							role: 'error',
							text: `${failed.length} change(s) failed: ${failed.map((c) => c.executionError).join('; ')}`,
						},
					]);
				} else {
					this.applied.set(true);
					const autoFixed = result.changes.filter((c) => c.aiAutoFixApplied);
					const successText =
						autoFixed.length > 0
							? `All changes applied successfully! ${autoFixed.length} statement(s) needed an AI repair before they could be applied — the originals failed against the database (e.g. ${autoFixed
									.map((c) => `${c.targetTableName}: ${this._summarizeError(c.aiAutoFixOriginalError)}`)
									.slice(0, 2)
									.join('; ')}).`
							: 'All changes applied successfully! Your tables have been created.';
					this.messages.update((msgs) =>
						msgs
							.map((m) => (m === batch ? { ...m, batchId: undefined } : m))
							.concat({
								role: 'ai',
								text: successText,
							}),
					);
					this._loadDiagram('Updated Database Structure');
				}
			}
		} catch (err: unknown) {
			const error = err as { error?: { message?: string }; message?: string };
			this.messages.update((msgs) => [
				...msgs,
				{
					role: 'error',
					text: error?.error?.message || error?.message || 'Failed to apply schema changes.',
				},
			]);
		} finally {
			this.applying.set(false);
		}
	}

	async onReject() {
		const batch = this.pendingBatch();
		if (!batch?.batchId) return;

		await this._tableSchema.rejectBatch(batch.batchId);
		this.messages.update((msgs) =>
			msgs
				.filter((m) => !(m.role === 'diagram' && m.text === 'Schema Preview'))
				.map((m) => (m === batch ? { ...m, batchId: undefined } : m))
				.concat({
					role: 'ai',
					text: 'Changes rejected. Feel free to describe what you need differently.',
				}),
		);
	}

	onOpenTables() {
		this.schemaApplied.emit();
	}

	onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			this.onSubmit();
		}
	}

	private async _loadDiagram(label: string) {
		this.initialDiagramLoading.set(true);
		try {
			const diagram = await this._tableSchema.fetchDiagram(this.connectionID);
			const source = diagram?.diagram ?? '';
			if (this._mermaidHasEntities(source)) {
				this.messages.update((msgs) => [
					...msgs,
					{
						role: 'diagram' as const,
						text: label,
						diagramSource: '```mermaid\n' + source + '\n```',
					},
				]);
			}
		} catch {
			// Diagram is supplementary - don't show error if it fails
		} finally {
			this.initialDiagramLoading.set(false);
		}
	}

	private _summarizeError(err: string | null | undefined): string {
		if (!err) return 'unknown error';
		const compact = err.replace(/\s+/g, ' ').trim();
		return compact.length > 120 ? `${compact.slice(0, 120)}…` : compact;
	}

	private _mermaidHasEntities(source: string): boolean {
		if (!source) return false;
		for (const line of source.split('\n')) {
			if (/^\s*[A-Za-z_][\w-]*\s*\{/.test(line)) return true;
		}
		return false;
	}

	private _extractColumnName(value: unknown): string | null {
		if (!value) return null;
		const inner = (value as { column?: unknown }).column ?? value;
		if (typeof inner === 'string') return inner;
		const expr = (inner as { expr?: { value?: unknown } })?.expr;
		if (expr && typeof expr.value === 'string') return expr.value;
		return null;
	}

	private _extractReferenceTable(value: unknown): string | null {
		if (!value) return null;
		const inner = (value as { reference_definition?: unknown }).reference_definition ?? value;
		const tables = (inner as { table?: unknown }).table;
		const first = Array.isArray(tables) ? tables[0] : tables;
		const name = (first as { table?: unknown })?.table;
		return typeof name === 'string' ? name : null;
	}

	private _changeMeta(changeType: string): { action: string; icon: string; tone: 'add' | 'edit' | 'remove' } {
		const map: Record<string, { action: string; icon: string; tone: 'add' | 'edit' | 'remove' }> = {
			CREATE_TABLE: { action: 'Create table', icon: 'add_box', tone: 'add' },
			DROP_TABLE: { action: 'Drop table', icon: 'delete_outline', tone: 'remove' },
			ADD_COLUMN: { action: 'Add column', icon: 'add', tone: 'add' },
			DROP_COLUMN: { action: 'Drop column', icon: 'remove', tone: 'remove' },
			ALTER_COLUMN: { action: 'Modify column', icon: 'edit', tone: 'edit' },
			ADD_INDEX: { action: 'Add index', icon: 'bookmark_add', tone: 'add' },
			DROP_INDEX: { action: 'Drop index', icon: 'bookmark_remove', tone: 'remove' },
			ADD_FOREIGN_KEY: { action: 'Add foreign key', icon: 'link', tone: 'add' },
			DROP_FOREIGN_KEY: { action: 'Drop foreign key', icon: 'link_off', tone: 'remove' },
			ADD_PRIMARY_KEY: { action: 'Add primary key', icon: 'vpn_key', tone: 'add' },
			DROP_PRIMARY_KEY: { action: 'Drop primary key', icon: 'key_off', tone: 'remove' },
			MONGO_CREATE_COLLECTION: { action: 'Create collection', icon: 'add_box', tone: 'add' },
			MONGO_DROP_COLLECTION: { action: 'Drop collection', icon: 'delete_outline', tone: 'remove' },
			MONGO_SET_VALIDATOR: { action: 'Set validator', icon: 'rule', tone: 'edit' },
			MONGO_CREATE_INDEX: { action: 'Create index', icon: 'bookmark_add', tone: 'add' },
			MONGO_DROP_INDEX: { action: 'Drop index', icon: 'bookmark_remove', tone: 'remove' },
			DYNAMODB_CREATE_TABLE: { action: 'Create table', icon: 'add_box', tone: 'add' },
			DYNAMODB_DROP_TABLE: { action: 'Drop table', icon: 'delete_outline', tone: 'remove' },
			DYNAMODB_UPDATE_TABLE: { action: 'Update table', icon: 'edit', tone: 'edit' },
			ELASTICSEARCH_CREATE_INDEX: { action: 'Create index', icon: 'add_box', tone: 'add' },
			ELASTICSEARCH_DELETE_INDEX: { action: 'Delete index', icon: 'delete_outline', tone: 'remove' },
			ELASTICSEARCH_UPDATE_MAPPING: { action: 'Update mapping', icon: 'edit', tone: 'edit' },
			ROLLBACK: { action: 'Rollback', icon: 'undo', tone: 'edit' },
		};
		const upper = (changeType ?? '').toUpperCase();
		return (
			map[upper] ?? {
				action: upper
					.replace(/_/g, ' ')
					.toLowerCase()
					.replace(/\b\w/, (c) => c.toUpperCase()),
				icon: 'code',
				tone: 'edit',
			}
		);
	}

	private _parseChange(change: SchemaChangeResponse): ParsedChange {
		const meta = this._changeMeta(change.changeType);
		const parsed: ParsedChange = {
			id: change.id,
			action: meta.action,
			icon: meta.icon,
			tone: meta.tone,
			targetTableName: change.targetTableName,
			aiSummary: change.aiSummary,
			columns: [],
			forwardSql: change.forwardSql,
		};
		if ((change.changeType ?? '').toUpperCase() === 'CREATE_TABLE' && change.forwardSql) {
			parsed.columns = this._parseCreateTableColumns(change.forwardSql);
		}
		return parsed;
	}

	private _parseCreateTableColumns(sql: string): ParsedColumn[] {
		const parser = new Parser();
		let ast: unknown;
		try {
			ast = parser.astify(sql, { database: 'PostgresQL' });
		} catch {
			try {
				ast = parser.astify(sql, { database: 'MySQL' });
			} catch {
				return [];
			}
		}
		const nodes = Array.isArray(ast) ? ast : [ast];
		const columns: ParsedColumn[] = [];
		const colIndex = new Map<string, number>();
		for (const node of nodes) {
			const root = node as Record<string, unknown> | null;
			if (!root || root['type'] !== 'create' || root['keyword'] !== 'table') continue;
			const defs = (root['create_definitions'] as unknown[]) ?? [];
			for (const rawDef of defs) {
				const def = rawDef as Record<string, unknown>;
				if (def['resource'] === 'column') {
					const name = this._extractColumnName(def['column']);
					if (!name) continue;
					const dataType = (def['definition'] as { dataType?: string } | undefined)?.dataType ?? '';
					const primary = def['primary'] as string | undefined;
					const nullable = (def['nullable'] as { value?: string } | undefined)?.value;
					const ref = this._extractReferenceTable(def['reference_definition']);
					colIndex.set(name, columns.length);
					columns.push({
						name,
						type: dataType.toLowerCase(),
						pk: primary === 'primary key' || primary === 'key',
						fk: !!ref,
						referenceTable: ref ?? undefined,
						notNull: nullable === 'not null',
						unique: !!def['unique'],
						defaultValue: this._extractDefault(def['default_val']),
					});
				} else if (def['resource'] === 'constraint') {
					const ctype = (def['constraint_type'] as string | undefined)?.toLowerCase();
					const colRefs = (def['definition'] as unknown[]) ?? [];
					if (ctype === 'primary key') {
						for (const c of colRefs) {
							const colName = this._extractColumnName(c);
							if (!colName) continue;
							const i = colIndex.get(colName);
							if (i !== undefined) columns[i].pk = true;
						}
					} else if (ctype === 'foreign key') {
						const refTable = this._extractReferenceTable(def['reference_definition']);
						for (const c of colRefs) {
							const colName = this._extractColumnName(c);
							if (!colName) continue;
							const i = colIndex.get(colName);
							if (i !== undefined) {
								columns[i].fk = true;
								if (refTable) columns[i].referenceTable = refTable;
							}
						}
					}
				}
			}
		}
		return columns;
	}

	private _extractDefault(value: unknown): string | undefined {
		if (!value || typeof value !== 'object') return undefined;
		const inner = (value as { value?: { type?: string; value?: unknown } }).value;
		if (!inner) return undefined;
		if (typeof inner === 'string' || typeof inner === 'number' || typeof inner === 'boolean') return String(inner);
		const v = (inner as { value?: unknown }).value;
		if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
		if ((inner as { type?: string }).type === 'function') {
			const name = (inner as { name?: { name?: { value?: string }[] } }).name?.name?.[0]?.value ?? '';
			return name ? `${name.toUpperCase()}()` : undefined;
		}
		return undefined;
	}
}
