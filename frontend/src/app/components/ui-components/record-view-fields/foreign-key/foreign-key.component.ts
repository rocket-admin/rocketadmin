import { Component, EventEmitter, Injectable, Input, Output } from '@angular/core';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TableForeignKey } from 'src/app/models/table';

@Injectable()
@Component({
  selector: 'app-display-foreign-key',
  templateUrl: './foreign-key.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './foreign-key.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class ForeignKeyRecordViewComponent extends BaseRecordViewFieldComponent {
  @Input() isSelected: boolean = false;
  @Input() relations: TableForeignKey;

  @Output() onForeignKeyClick = new EventEmitter<{foreignKey: any, value: string}>();

  constructor() {
    super();
  }

  handleForeignKeyClick($event): void {
    $event.stopPropagation();
    if (this.relations && this.value) {
      this.onForeignKeyClick.emit({
        foreignKey: this.relations,
        value: this.value
      });
    }
  }
}
