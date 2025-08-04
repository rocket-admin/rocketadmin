import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { normalizeTableName } from 'src/app/lib/normalize';

@Component({
  selector: 'app-edit-filter-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <h2 mat-dialog-title>Edit {{ normalizeTableName(data.entry.column) }} filter</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width: 100%">
        <mat-label>Filter value</mat-label>
        <input matInput [(ngModel)]="data.entry.value">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-button color="primary" (click)="dialogRef.close(data.entry)">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 300px;
      padding-top: 10px;
    }
  `]
})
export class EditFilterDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<EditFilterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {entry: {column: string, operator: string, value: any}}
  ) {}

  normalizeTableName = normalizeTableName;
}
