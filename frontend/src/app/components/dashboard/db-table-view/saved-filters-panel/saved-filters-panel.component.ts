import { Component, Input } from '@angular/core';

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { SavedFiltersDialogComponent } from './saved-filters-dialog/saved-filters-dialog.component';

@Component({
  selector: 'app-saved-filters-panel',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './saved-filters-panel.component.html',
  styleUrl: './saved-filters-panel.component.css'
})
export class SavedFiltersPanelComponent {
  @Input() connectionID: string;
  @Input() selectedTableName: string;
  @Input() selectedTableDisplayName: string;
  @Input() savedFilterData: any;

  constructor(private dialog: MatDialog) {}



  handleOpenSavedFiltersDialog() {
    this.dialog.open(SavedFiltersDialogComponent, {
      width: '56em',
      data: {
        connectionID: this.connectionID,
        tableName: this.selectedTableName,
        displayTableName: this.selectedTableDisplayName,
        savedFilterData: this.savedFilterData
      }
    });
  }
}
