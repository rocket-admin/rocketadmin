import { Component, EventEmitter, Inject, OnInit, Output } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-widget-delete-dialog',
  templateUrl: './widget-delete-dialog.component.html',
  styleUrls: ['./widget-delete-dialog.component.css']
})
export class WidgetDeleteDialogComponent implements OnInit {

  @Output() deleteWidget = new EventEmitter();

  constructor(
    @Inject(MAT_DIALOG_DATA) public widgetFieldName: any,
    private dialogRef: MatDialogRef<WidgetDeleteDialogComponent>
  ) { }

  ngOnInit(): void {
  }

  onDeleteWidget() {
    this.deleteWidget.emit(this.widgetFieldName);
  }

}
