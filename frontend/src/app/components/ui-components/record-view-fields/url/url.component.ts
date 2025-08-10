import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { CommonModule } from '@angular/common';
import { Component, Injectable } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Injectable()
@Component({
  selector: 'app-url-record-view',
  templateUrl: './url.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './url.component.css'],
  imports: [CommonModule, MatIconModule]
})
export class UrlRecordViewComponent extends BaseRecordViewFieldComponent {
  static type = 'url';

  get isValidUrl(): boolean {
    if (!this.value) return false;
    try {
      new URL(this.value);
      return true;
    } catch {
      return false;
    }
  }
}
