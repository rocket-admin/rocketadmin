import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-widget-delete-dialog',
  templateUrl: './widget-delete-dialog.component.html',
  styleUrls: ['./widget-delete-dialog.component.css'],
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule]
})
export class WidgetDeleteDialogComponent implements OnInit {

  constructor(
    @Inject(MAT_DIALOG_DATA) public widgetFieldName: any,
    private dialogRef: MatDialogRef<WidgetDeleteDialogComponent>
  ) { }

  ngOnInit(): void {
  }
}
