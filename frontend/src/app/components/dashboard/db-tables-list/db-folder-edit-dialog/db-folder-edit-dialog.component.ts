import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { TableProperties } from 'src/app/models/table';

export interface Folder {
  id: string;
  name: string;
  expanded: boolean;
  tableIds: string[];
  iconColor?: string;
  isEmpty?: boolean;
}

export interface DbFolderEditDialogData {
  folder: Folder;
  tables: TableProperties[];
  folderIconColors: { name: string; value: string }[];
}

@Component({
  selector: 'app-db-folder-edit-dialog',
  templateUrl: './db-folder-edit-dialog.component.html',
  styleUrls: ['./db-folder-edit-dialog.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ]
})
export class DbFolderEditDialogComponent {
  public folder: Folder;
  public tables: TableProperties[];
  public folderIconColors: { name: string; value: string }[];
  private originalFolderName: string;

  constructor(
    public dialogRef: MatDialogRef<DbFolderEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DbFolderEditDialogData
  ) {
    // Create a copy of the folder to work with
    this.folder = { ...data.folder, tableIds: [...data.folder.tableIds] };
    // Store original name for validation
    this.originalFolderName = data.folder.name;
    // Set default color if not set
    if (!this.folder.iconColor) {
      this.folder.iconColor = '#757575';
    }
    this.tables = data.tables;
    this.folderIconColors = data.folderIconColors;
  }

  getFolderIconColor(folder: Folder): string {
    return folder.iconColor || '#757575';
  }

  onColorChange(color: string) {
    console.log('Folder color changed to:', color);
  }

  isTableInFolder(table: TableProperties): boolean {
    return this.folder.tableIds.includes(table.table);
  }

  getTableName(table: TableProperties): string {
    return table.display_name || table.table;
  }

  toggleTableInFolder(table: TableProperties) {
    const tableId = table.table;
    const isInFolder = this.folder.tableIds.includes(tableId);

    if (isInFolder) {
      // Remove table from folder
      this.folder.tableIds = this.folder.tableIds.filter(id => id !== tableId);
    } else {
      // Add table to folder
      this.folder.tableIds.push(tableId);
      // If this was an empty folder, mark it as no longer empty
      if (this.folder.isEmpty) {
        this.folder.isEmpty = false;
      }
    }

    console.log('toggleTableInFolder');
  }

  isAllTablesFolder(): boolean {
    return this.folder.id === '0' || this.folder.name === 'All Tables';
  }

  onSave() {
    // Validate folder name
    if (!this.folder.name || this.folder.name.trim() === '') {
      return; // Don't save if name is empty
    }

    // Trim the folder name before saving
    this.folder.name = this.folder.name.trim();
    this.dialogRef.close(this.folder);
  }

  onCancel() {
    this.dialogRef.close();
  }
}