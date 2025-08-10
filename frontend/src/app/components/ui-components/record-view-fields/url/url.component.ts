import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, Injectable } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Injectable()
@Component({
  selector: 'app-url-display',
  templateUrl: './url.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './url.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
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
