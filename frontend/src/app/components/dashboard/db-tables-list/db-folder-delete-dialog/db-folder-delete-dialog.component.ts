import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface DbFolderDeleteDialogData {
  folderName: string;
  tableCount: number;
}

@Component({
  selector: 'app-db-folder-delete-dialog',
  templateUrl: './db-folder-delete-dialog.component.html',
  styleUrls: ['./db-folder-delete-dialog.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class DbFolderDeleteDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DbFolderDeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DbFolderDeleteDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onDelete(): void {
    this.dialogRef.close(true);
  }
}