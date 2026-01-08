import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConnectionsService } from 'src/app/services/connections.service';
import { S3Service } from 'src/app/services/s3.service';
import { TablesService } from 'src/app/services/tables.service';
import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';

interface S3WidgetParams {
	bucket: string;
	prefix?: string;
	region?: string;
	aws_access_key_id_secret_name: string;
	aws_secret_access_key_secret_name: string;
	type?: 'file' | 'image';
}

@Component({
	selector: 'app-s3-display',
	templateUrl: './s3.component.html',
	styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './s3.component.css'],
	imports: [CommonModule, ClipboardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
})
export class S3DisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
	public params: S3WidgetParams;
	public previewUrl: string | null = null;
	public isLoading: boolean = false;

	private connectionId: string;
	private tableName: string;

	constructor(
		private s3Service: S3Service,
		private connectionsService: ConnectionsService,
		private tablesService: TablesService,
	) {
		super();
	}

	ngOnInit(): void {
		this.connectionId = this.connectionsService.currentConnectionID;
		this.tableName = this.tablesService.currentTableName;
		this._parseWidgetParams();

		if (this.value && this.isImageType && this.rowPrimaryKey) {
			this._loadPreview();
		}
	}

	get isImageType(): boolean {
		return this.params?.type === 'image';
	}

	get rowPrimaryKey(): Record<string, unknown> | null {
		if (!this.rowData || !this.primaryKeys) return null;

		const primaryKey: Record<string, unknown> = {};
		for (const pk of this.primaryKeys) {
			primaryKey[pk.column_name] = this.rowData[pk.column_name];
		}
		return primaryKey;
	}

	private _parseWidgetParams(): void {
		if (this.widgetStructure?.widget_params) {
			try {
				this.params =
					typeof this.widgetStructure.widget_params === 'string'
						? JSON.parse(this.widgetStructure.widget_params)
						: this.widgetStructure.widget_params;
			} catch (e) {
				console.error('Error parsing S3 widget params:', e);
			}
		}
	}

	private _loadPreview(): void {
		const primaryKey = this.rowPrimaryKey;
		if (!this.value || !this.connectionId || !this.tableName || !primaryKey) return;

		this.isLoading = true;

		this.s3Service
			.getFileUrl(this.connectionId, this.tableName, this.widgetStructure.field_name, primaryKey)
			.subscribe({
				next: (response) => {
					this.previewUrl = response.url;
					this.isLoading = false;
				},
				error: () => {
					this.isLoading = false;
				},
			});
	}
}
