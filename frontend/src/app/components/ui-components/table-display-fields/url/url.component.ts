import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-url-display',
  templateUrl: './url.component.html',
  styleUrls: ['./url.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class UrlDisplayComponent extends BaseTableDisplayFieldComponent {
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
  
//   get displayUrl(): string {
//     if (!this.value) return '—';
    
//     if (this.value.length > 30) {
//       return this.value.substring(0, 27) + '...';
//     }
//     return this.value;
//   }
}
