import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
	selector: 'app-db-action-link-dialog',
	templateUrl: './db-action-link-dialog.component.html',
	styleUrls: ['./db-action-link-dialog.component.css'],
	imports: [CommonModule, MatButtonModule, MatDialogModule],
})
export class DbActionLinkDialogComponent implements OnInit {
	constructor(
		@Inject(MAT_DIALOG_DATA) public data: any,
		public dialogRef: MatDialogRef<DbActionLinkDialogComponent>,
	) {}

	ngOnInit(): void {}

	closeDialog() {
		this.dialogRef.close();
	}
}
