import { Component, input, output } from '@angular/core';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TableForeignKey } from 'src/app/models/table';

@Component({
  selector: 'app-display-foreign-key',
  templateUrl: './foreign-key.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './foreign-key.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class ForeignKeyDisplayComponent extends BaseTableDisplayFieldComponent {
  readonly isSelected = input<boolean>(false);
  readonly relations = input<TableForeignKey>();

  readonly onForeignKeyClick = output<{foreignKey: any, value: string}>();

  handleForeignKeyClick($event): void {
    $event.stopPropagation();
    if (this.relations() && this.value()) {
      this.onForeignKeyClick.emit({
        foreignKey: this.relations(),
        value: this.value()
      });
    }
  }
}
