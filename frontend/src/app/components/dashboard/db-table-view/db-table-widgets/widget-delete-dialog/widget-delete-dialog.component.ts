import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'app-widget-delete-dialog',
	templateUrl: './widget-delete-dialog.component.html',
	styleUrls: ['./widget-delete-dialog.component.css'],
	imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
})
export class WidgetDeleteDialogComponent implements OnInit {
	constructor(
		@Inject(MAT_DIALOG_DATA) public widgetFieldName: any,
		_dialogRef: MatDialogRef<WidgetDeleteDialogComponent>,
	) {}

	ngOnInit(): void {}
}
