import { Component, EventEmitter, Input, Output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TableSchemaService, SchemaChangeResponse } from 'src/app/services/table-schema.service';

interface ChatMessage {
	role: 'user' | 'ai' | 'error';
	text: string;
	changes?: SchemaChangeResponse[];
	batchId?: string;
}

@Component({
	selector: 'app-db-generate-schema',
	templateUrl: './db-generate-schema.component.html',
	styleUrls: ['./db-generate-schema.component.css'],
	imports: [
		CommonModule,
		FormsModule,
		MatButtonModule,
		MatIconModule,
		MatFormFieldModule,
		MatInputModule,
	],
})
export class DbGenerateSchemaComponent {
	@Input() connectionID: string;
	@Input() showClose: boolean = false;
	@Output() schemaApplied = new EventEmitter<void>();
	@Output() closeEditor = new EventEmitter<void>();

	private _tableSchema = inject(TableSchemaService);

	protected messages = signal<ChatMessage[]>([]);
	protected userPrompt = signal('');
	protected submitting = signal(false);
	protected applying = signal(false);
	protected applied = signal(false);

	protected pendingBatch = computed(() => {
		const msgs = this.messages();
		for (let i = msgs.length - 1; i >= 0; i--) {
			if (msgs[i].batchId && msgs[i].changes?.length) return msgs[i];
		}
		return null;
	});

	async onSubmit() {
		const prompt = this.userPrompt().trim();
		if (!prompt || this.submitting()) return;

		this.messages.update(msgs => [...msgs, { role: 'user', text: prompt }]);
		this.userPrompt.set('');
		this.submitting.set(true);

		try {
			const result = await this._tableSchema.generateSchemaChange(this.connectionID, prompt);
			if (result && result.changes.length > 0) {
				const summary = result.changes.map(c => `**${c.changeType}** \`${c.targetTableName}\`${c.aiSummary ? ' — ' + c.aiSummary : ''}`).join('\n');
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
					this.messages.update(msgs => [...msgs, {
						role: 'ai',
						text: 'All changes applied successfully! Your tables have been created. Reloading...',
					}]);
					this.schemaApplied.emit();
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

	onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			this.onSubmit();
		}
	}

}
