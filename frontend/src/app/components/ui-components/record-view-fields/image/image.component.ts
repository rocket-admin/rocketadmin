import { CommonModule } from '@angular/common';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { Component, Injectable } from '@angular/core';

@Injectable()
@Component({
  selector: 'app-image-record-view',
  templateUrl: './image.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './image.component.css'],
  imports: [CommonModule]
})
export class ImageRecordViewComponent extends BaseRecordViewFieldComponent {
  get isUrl(): boolean {
    if (!this.value) return false;
    try {
      new URL(this.value);
      return true;
    } catch {
      return false;
    }
  }
}
