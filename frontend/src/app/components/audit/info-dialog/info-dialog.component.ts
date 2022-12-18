import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { format } from 'date-fns'
import { normalizeFieldName, normalizeTableName } from 'src/app/lib/normalize';
import { Log } from 'src/app/models/logs';

@Component({
  selector: 'app-info-dialog',
  templateUrl: './info-dialog.component.html',
  styleUrls: ['./info-dialog.component.css']
})
export class InfoDialogComponent implements OnInit {

  public normalizedTableName: string;
  public diffFields: string[] = [];
  public fields: string[];
  public filedsNames: object;
  public formattedCrreatedAt: string;
  public action: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public log: Log,
  ) { }

  ngOnInit(): void {
    const actions = {
      successfully: {
        addRow: 'added the row',
        deleteRow: 'deleted the row',
        updateRow: 'edited the row',
        rowReceived: 'received the row',
        rowsReceived: 'received rows'
      },
      unsuccessfully: {
        addRow: 'attempted to add the row',
        deleteRow: 'attempted to delete the row',
        updateRow: 'attempted to edit the row',
        rowReceived: 'attempted to receive the row',
        rowsReceived: 'attempted to receive rows'
      }
    };

    if (this.log && this.log.createdAt) {
      const datetime = new Date(this.log.createdAt);
      this.formattedCrreatedAt = format(datetime, 'PPPpp');
      this.action = actions[this.log.Status][this.log.operationType];

      this.normalizedTableName = normalizeTableName(this.log.Table);

      if (this.log.currentValue) {
        this.fields = Object.keys(this.log.currentValue);
        if (this.log.operationType === 'updateRow')
          this.diffFields = this.getFieldsDiff(this.log.prevValue, this.log.currentValue);

        this.filedsNames = Object.assign({}, ...this.fields.map((field) => ({[field]: normalizeFieldName(field)})));
      }
    }
  }

  isChangedFiled(field: string) {
    if (this.diffFields.length) return this.diffFields.includes(field);
  }

  getFieldsDiff(prevLog, currentLog) {
    if (prevLog) {
      const diff = Object.entries(prevLog)
      .map(([key, value]) => {
        if (currentLog[key] !== value) return key;
      })
      .filter(key => key);
      return diff;
    }
    return currentLog;
  }
}
