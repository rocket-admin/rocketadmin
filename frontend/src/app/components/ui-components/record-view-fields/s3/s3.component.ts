import { CommonModule } from '@angular/common';
import { Component, Injectable, OnInit } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ConnectionsService } from 'src/app/services/connections.service';
import { S3Service } from 'src/app/services/s3.service';
import { TablesService } from 'src/app/services/tables.service';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

interface S3WidgetParams {
	bucket: string;
	prefix?: string;
	region?: string;
	aws_access_key_id_secret_name: string;
	aws_secret_access_key_secret_name: string;
	type?: 'file' | 'image';
}

@Injectable()
@Component({
	selector: 'app-s3-record-view',
	templateUrl: './s3.component.html',
	styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './s3.component.css'],
	imports: [CommonModule, MatProgressSpinnerModule],
})
export class S3RecordViewComponent extends BaseRecordViewFieldComponent implements OnInit {
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

		if (this.value && this.isImageType && this.primaryKeys) {
			this._loadPreview();
		}
	}

	get isImageType(): boolean {
		return this.params?.type === 'image';
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

	private async _loadPreview(): Promise<void> {
		if (!this.value || !this.connectionId || !this.tableName || !this.primaryKeys) return;

		this.isLoading = true;

		const response = await this.s3Service.getFileUrl(
			this.connectionId,
			this.tableName,
			this.widgetStructure.field_name,
			this.primaryKeys,
		);

		if (response) {
			this.previewUrl = response.url;
		}

		this.isLoading = false;
	}
}
