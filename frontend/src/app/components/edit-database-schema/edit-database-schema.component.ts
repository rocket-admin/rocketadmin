import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';
import { TableSchemaService, SchemaChangeResponse } from 'src/app/services/table-schema.service';

interface ChatMessage {
	role: 'user' | 'ai' | 'error' | 'diagram';
	text: string;
	diagramSource?: string;
	changes?: SchemaChangeResponse[];
	batchId?: string;
}

@Component({
	selector: 'app-edit-database-schema',
	templateUrl: './edit-database-schema.component.html',
	styleUrls: ['./edit-database-schema.component.css'],
	imports: [
		CommonModule,
		FormsModule,
		MarkdownModule,
		MatButtonModule,
		MatIconModule,
		MatFormFieldModule,
		MatInputModule,
		RouterModule,
	],
})
export class EditDatabaseSchemaComponent implements OnInit, AfterViewInit {
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
	protected diagramZoom = signal(1);
	protected initialDiagramLoading = signal(false);
	private _threadId: string | undefined;

	protected pendingBatch = computed(() => {
		const msgs = this.messages();
		for (let i = msgs.length - 1; i >= 0; i--) {
			if (msgs[i].batchId && msgs[i].changes?.length) return msgs[i];
		}
		return null;
	});

	async ngAfterViewInit() {
		const mermaid = await import('mermaid');
		const mermaidAPI = (mermaid.default ?? mermaid) as { initialize: (config: Record<string, unknown>) => void };
		const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		mermaidAPI.initialize({
			startOnLoad: false,
			theme: isDark ? 'dark' : 'default',
		});
		//@ts-expect-error dynamic load of mermaid
		window.mermaid = mermaidAPI;
	}

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

		this.messages.update(msgs => [...msgs, { role: 'user', text: prompt }]);
		this.userPrompt.set('');
		this.submitting.set(true);

		try {
			const result = await this._tableSchema.generateSchemaChange(this.connectionID, prompt, this._threadId);
			if (result.threadId) {
				this._threadId = result.threadId;
			}
			if (result && result.changes.length > 0) {
				const summary = result.changes.map(c => `**${c.changeType}** \`${c.targetTableName}\`${c.aiSummary ? ' — ' + c.aiSummary : ''}`).join('\n');
				this.applied.set(false);
				this.messages.update(msgs => [...msgs, {
					role: 'ai',
					text: `I've generated ${result.changes.length} change(s) for your database:\n\n${summary}\n\nReview the SQL below and approve or reject.`,
					changes: result.changes,
					batchId: result.batchId,
				}]);
			} else {
				this.messages.update(msgs => [...msgs, {
					role: 'ai',
					text: 'I could not generate any schema changes for that prompt. Could you describe your database in more detail?',
				}]);
			}
		} catch (err: unknown) {
			const error = err as { error?: { message?: string }; message?: string };
			this.messages.update(msgs => [...msgs, {
				role: 'error',
				text: error?.error?.message || error?.message || 'Failed to generate schema changes.',
			}]);
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
				const failed = result.changes.filter(c => c.status === 'failed');
				if (failed.length > 0) {
					this.messages.update(msgs => [...msgs, {
						role: 'error',
						text: `${failed.length} change(s) failed: ${failed.map(c => c.executionError).join('; ')}`,
					}]);
				} else {
					this.applied.set(true);
					this.messages.update(msgs => msgs.map(m =>
						m === batch ? { ...m, batchId: undefined } : m
					).concat({
						role: 'ai',
						text: 'All changes applied successfully! Your tables have been created.',
					}));
					this._loadDiagram('Updated Database Structure');
				}
			}
		} catch (err: unknown) {
			const error = err as { error?: { message?: string }; message?: string };
			this.messages.update(msgs => [...msgs, {
				role: 'error',
				text: error?.error?.message || error?.message || 'Failed to apply schema changes.',
			}]);
		} finally {
			this.applying.set(false);
		}
	}

	async onReject() {
		const batch = this.pendingBatch();
		if (!batch?.batchId) return;

		await this._tableSchema.rejectBatch(batch.batchId);
		this.messages.update(msgs => msgs.map(m =>
			m === batch ? { ...m, batchId: undefined } : m
		).concat({
			role: 'ai',
			text: 'Changes rejected. Feel free to describe what you need differently.',
		}));
	}

	onOpenTables() {
		this.schemaApplied.emit();
	}

	onZoomIn() {
		this.diagramZoom.update(z => Math.min(z + 0.25, 3));
	}

	onZoomOut() {
		this.diagramZoom.update(z => Math.max(z - 0.25, 0.25));
	}

	onZoomReset() {
		this.diagramZoom.set(1);
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
			if (diagram?.diagram) {
				this.messages.update(msgs => [...msgs, {
					role: 'diagram' as const,
					text: label,
					diagramSource: '```mermaid\n' + diagram.diagram + '\n```',
				}]);
			}
		} catch {
			// Diagram is supplementary - don't show error if it fails
		} finally {
			this.initialDiagramLoading.set(false);
		}
	}
}
