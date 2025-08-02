import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

import { TablesService } from 'src/app/services/tables.service';

@Component({
  selector: 'app-action-delete-dialog',
  templateUrl: './action-delete-dialog.component.html',
  styleUrls: ['./action-delete-dialog.component.css'],
  imports: [CommonModule, MatButtonModule, MatDialogModule]
})
export class ActionDeleteDialogComponent implements OnInit {

  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _tables: TablesService,
    public dialogRef: MatDialogRef<ActionDeleteDialogComponent>
  ) { }

  ngOnInit(): void {
    this._tables.cast.subscribe();
  }

  deleteAction() {
    this.submitting = true;
    this._tables.deleteRule(this.data.connectionID, this.data.selectedTableName, this.data.rule.id)
      .subscribe(() => {
        this.dialogRef.close();
        this.submitting = false;
      },
      () => { this.submitting = false; },
      () => { this.submitting = false; }
    )
  }

}
