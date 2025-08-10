import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, Injectable } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface Blob {
  type: string;
  data: any[];
}

@Injectable()
@Component({
  selector: 'app-file-display',
  templateUrl: './file.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './file.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class FileRecordViewComponent extends BaseRecordViewFieldComponent {
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
