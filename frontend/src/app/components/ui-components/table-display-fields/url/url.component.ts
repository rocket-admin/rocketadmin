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
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './url.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class UrlDisplayComponent extends BaseTableDisplayFieldComponent {
  static type = 'url';
  
  get hrefValue(): string {
    if (!this.value) return '';
    const prefix = this.widgetStructure?.widget_params?.prefix || '';
    return prefix + this.value;
  }
  
  get isValidUrl(): boolean {
    if (!this.value) return false;
    try {
      // Check if the prefixed URL is valid
      new URL(this.hrefValue);
      return true;
    } catch {
      return false;
    }
  }
}
