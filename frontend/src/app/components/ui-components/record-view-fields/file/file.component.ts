import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { Component, Injectable } from '@angular/core';

interface Blob {
  type: string;
  data: any[];
}

@Injectable()
@Component({
  selector: 'app-file-record-view',
  templateUrl: './file.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './file.component.css'],
  imports: []
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
