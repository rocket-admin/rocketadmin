import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { normalizeFieldName } from 'src/app/lib/normalize';
import { TableField, TableForeignKey, WidgetStructure } from 'src/app/models/table';
import { ConnectionsService } from 'src/app/services/connections.service';
import { S3Service } from 'src/app/services/s3.service';
import { TablesService } from 'src/app/services/tables.service';

interface S3WidgetParams {
	bucket: string;
	prefix?: string;
	region?: string;
	aws_access_key_id_secret_name: string;
	aws_secret_access_key_secret_name: string;
	type?: 'file' | 'image';
}

@Component({
	selector: 'app-edit-s3',
	templateUrl: './s3.component.html',
	styleUrl: './s3.component.css',
	imports: [
		CommonModule,
		FormsModule,
		MatFormFieldModule,
		MatInputModule,
		MatButtonModule,
		MatIconModule,
		MatProgressSpinnerModule,
	],
})
export class S3EditComponent implements OnInit {
	// Signal-based inputs
	readonly key = input<string>();
	readonly label = input<string>();
	readonly required = input<boolean>(false);
	readonly readonly = input<boolean>(false);
	readonly structure = input<TableField>();
	readonly disabled = input<boolean>(false);
	readonly widgetStructure = input<WidgetStructure>();
	readonly relations = input<TableForeignKey>();
	readonly value = input<string>();
	readonly rowPrimaryKey = input<Record<string, unknown>>();

	// Signal-based output
	readonly onFieldChange = output<string>();

	// Internal state as signals
	readonly previewUrl = signal<string | null>(null);
	readonly isLoading = signal(false);
	readonly internalValue = signal<string>('');

	// Computed signals
	readonly normalizedLabel = computed(() => normalizeFieldName(this.label() || ''));

	readonly params = computed<S3WidgetParams | null>(() => {
		const ws = this.widgetStructure();
		if (!ws?.widget_params) return null;
		try {
			return typeof ws.widget_params === 'string' ? JSON.parse(ws.widget_params) : ws.widget_params;
		} catch {
			return null;
		}
	});

	readonly displayFilename = computed(() => {
		const val = this.internalValue() || this.value();
		if (!val) return '';
		const name = val.split('/').pop() || val;
		return name.length > 40 ? '...' + name.slice(-37) : name;
	});

	readonly isImage = computed(() => {
		const p = this.params();
		const val = this.internalValue() || this.value();
		if (p?.type === 'image') return true;
		if (!val) return false;
		const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
		return imageExtensions.some((ext) => val.toLowerCase().endsWith(ext));
	});

	readonly fileAccept = computed(() => {
		return this.params()?.type === 'image' ? 'image/*' : '*/*';
	});

	// Services
	private readonly s3Service = inject(S3Service);
	private readonly connectionsService = inject(ConnectionsService);
	private readonly tablesService = inject(TablesService);

	private connectionId: string;
	private tableName: string;

	constructor() {
		// Effect to load preview when value changes
		effect(() => {
			const val = this.value();
			const rowPk = this.rowPrimaryKey();
			if (val && rowPk && !this.previewUrl() && !this.isLoading()) {
				this._loadPreview();
			}
		});
	}

	ngOnInit(): void {
		this.connectionId = this.connectionsService.currentConnectionID;
		this.tableName = this.tablesService.currentTableName;

		// Initialize internal value from input
		const initialValue = this.value();
		if (initialValue) {
			this.internalValue.set(initialValue);
			this._loadPreview();
		}
	}

	async onFileSelected(event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		if (!input.files?.length) return;

		const file = input.files[0];
		const fieldName = this.widgetStructure()?.field_name;
		if (!fieldName) return;

		this.isLoading.set(true);

		const result = await this.s3Service.uploadFile(this.connectionId, this.tableName, fieldName, file);

		if (result) {
			this.internalValue.set(result.key);
			this.previewUrl.set(result.previewUrl);
			this.onFieldChange.emit(result.key);
		}

		this.isLoading.set(false);
	}

	openFile(): void {
		const url = this.previewUrl();
		if (url) {
			window.open(url, '_blank');
		}
	}

	onValueChange(newValue: string): void {
		this.internalValue.set(newValue);
		this.onFieldChange.emit(newValue);
	}

	private async _loadPreview(): Promise<void> {
		const val = this.value() || this.internalValue();
		const rowPk = this.rowPrimaryKey();
		const fieldName = this.widgetStructure()?.field_name;

		if (!val || !this.connectionId || !this.tableName || !rowPk || !fieldName) return;

		this.isLoading.set(true);

		const response = await this.s3Service.getFileUrl(this.connectionId, this.tableName, fieldName, rowPk);

		if (response) {
			this.previewUrl.set(response.url);
		}

		this.isLoading.set(false);
	}
}
