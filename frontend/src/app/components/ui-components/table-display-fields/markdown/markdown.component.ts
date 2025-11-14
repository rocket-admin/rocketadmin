import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-markdown-display',
  templateUrl: './markdown.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './markdown.component.css'],
  imports: [CommonModule, MarkdownModule, ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class MarkdownDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
  public renderedMarkdown: string = '';
  public truncatedValue: string = '';

  ngOnInit(): void {
    this.renderedMarkdown = this.value || '';
    // Truncate long markdown for table display
    if (this.value && this.value.length > 100) {
      this.truncatedValue = this.value.substring(0, 100) + '...';
    } else {
      this.truncatedValue = this.value || '—';
    }
  }
}
