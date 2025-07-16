import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-json-editor-display',
  templateUrl: './json-editor.component.html',
  styleUrls: ['./json-editor.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class JsonEditorDisplayComponent extends BaseTableDisplayFieldComponent {
  static type = 'json-editor';
  
  get formattedJson(): string {
    if (!this.value) return '';
    
    try {
      const parsedValue = typeof this.value === 'string' ? JSON.parse(this.value) : this.value;
      return JSON.stringify(parsedValue, null, 2);
    } catch (e) {
      return String(this.value);
    }
  }
}
