import { CommonModule } from "@angular/common";
import { Component, Input, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ConnectionsService } from "src/app/services/connections.service";
import { S3Service } from "src/app/services/s3.service";
import { TablesService } from "src/app/services/tables.service";
import { BaseEditFieldComponent } from "../base-row-field/base-row-field.component";

interface S3WidgetParams {
	bucket: string;
	prefix?: string;
	region?: string;
	aws_access_key_id_secret_name: string;
	aws_secret_access_key_secret_name: string;
}

@Component({
	selector: "app-edit-s3",
	templateUrl: "./s3.component.html",
	styleUrl: "./s3.component.css",
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
export class S3EditComponent extends BaseEditFieldComponent implements OnInit {
	@Input() value: string;
	@Input() rowPrimaryKey: Record<string, unknown>;

	public params: S3WidgetParams;
	public previewUrl: string | null = null;
	public isImage: boolean = false;
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
		super.ngOnInit();
		this.connectionId = this.connectionsService.currentConnectionID;
		this.tableName = this.tablesService.currentTableName;
		this._parseWidgetParams();
		if (this.value) {
			this._loadPreview();
		}
	}

	ngOnChanges(): void {
		this._parseWidgetParams();
		if (this.value && !this.previewUrl && !this.isLoading) {
			this._loadPreview();
		}
	}

	onFileSelected(event: Event): void {
		const input = event.target as HTMLInputElement;
		if (!input.files?.length) return;

		const file = input.files[0];
		this.isLoading = true;

		this.s3Service
			.getUploadUrl(
				this.connectionId,
				this.tableName,
				this.widgetStructure.field_name,
				file.name,
				file.type,
			)
			.subscribe({
				next: (response) => {
					this.s3Service.uploadToS3(response.uploadUrl, file).subscribe({
						next: () => {
							this.value = response.key;
							this.onFieldChange.emit(response.key);
							this._loadPreview();
						},
						error: () => {
							this.isLoading = false;
						},
					});
				},
				error: () => {
					this.isLoading = false;
				},
			});
	}

	openFile(): void {
		if (this.previewUrl) {
			window.open(this.previewUrl, "_blank");
		}
	}

	private _parseWidgetParams(): void {
		if (this.widgetStructure?.widget_params) {
			try {
				this.params =
					typeof this.widgetStructure.widget_params === "string"
						? JSON.parse(this.widgetStructure.widget_params)
						: this.widgetStructure.widget_params;
			} catch (e) {
				console.error("Error parsing S3 widget params:", e);
			}
		}
	}

	private _loadPreview(): void {
		if (
			!this.value ||
			!this.connectionId ||
			!this.tableName ||
			!this.rowPrimaryKey
		)
			return;

		this.isLoading = true;
		this.isImage = this._isImageFile(this.value);

		this.s3Service
			.getFileUrl(
				this.connectionId,
				this.tableName,
				this.widgetStructure.field_name,
				this.rowPrimaryKey,
			)
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

	private _isImageFile(key: string): boolean {
		const imageExtensions = [
			".jpg",
			".jpeg",
			".png",
			".gif",
			".webp",
			".svg",
			".bmp",
		];
		const lowerKey = key.toLowerCase();
		return imageExtensions.some((ext) => lowerKey.endsWith(ext));
	}
}
