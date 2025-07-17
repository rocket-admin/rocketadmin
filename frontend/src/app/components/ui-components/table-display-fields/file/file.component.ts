import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface Blob {
  type: string;
  data: any[];
}

@Component({
  selector: 'app-file-display',
  templateUrl: './file.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './file.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class FileDisplayComponent extends BaseTableDisplayFieldComponent {
  static type = 'file';
  
  get isBlob(): boolean {
    return typeof this.value === 'object' && this.value !== null && 'type' in this.value && 'data' in this.value;
  }
  
  get displayText(): string {
    if (this.isBlob) {
      return 'Binary Data';
    } else if (typeof this.value === 'string' && this.value.length > 20) {
      return 'Binary Data';
    }
    return this.value ? String(this.value) : '—';
  }
}
