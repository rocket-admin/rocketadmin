import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { marked } from 'marked';

@Component({
  selector: 'app-markdown-display',
  templateUrl: './markdown.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './markdown.component.css'],
  imports: [CommonModule, MarkdownModule, ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class MarkdownDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
  public renderedMarkdown: string = '';
  public displayTitle: string = '';

  ngOnInit(): void {
    this.renderedMarkdown = this.value || '';
    this.displayTitle = this._extractTitle(this.value);
  }

  /**
   * Extracts a title from markdown content using marked lexer
   * Prioritizes headings, then falls back to first paragraph
   * @param markdown The markdown content
   * @returns Extracted and cleaned title string
   */
  private _extractTitle(markdown: string): string {
    if (!markdown || markdown.trim() === '') {
      return '—';
    }

    try {
      const tokens = marked.lexer(markdown);

      // First pass: look for headings (h1-h6)
      for (const token of tokens) {
        if (token.type === 'heading') {
          return this._truncateText(token.text, 100);
        }
      }

      // Second pass: look for first paragraph or text
      for (const token of tokens) {
        if (token.type === 'paragraph') {
          return this._truncateText(token.text, 100);
        }
        if (token.type === 'text' && token.text.trim().length > 0) {
          return this._truncateText(token.text, 100);
        }
      }

      // If no heading or paragraph found, return first non-empty line
      const firstLine = markdown.trim().split('\n')[0];
      return this._truncateText(firstLine, 100);
    } catch (error) {
      // Fallback if parsing fails
      const firstLine = markdown.trim().split('\n')[0];
      return this._truncateText(firstLine, 100);
    }
  }

  /**
   * Truncates text to specified length and adds ellipsis if needed
   * @param text Text to truncate
   * @param maxLength Maximum length before truncation
   * @returns Truncated text with ellipsis if applicable
   */
  private _truncateText(text: string, maxLength: number): string {
    const cleaned = text.trim();
    if (cleaned.length > maxLength) {
      return cleaned.substring(0, maxLength) + '...';
    }
    return cleaned || '—';
  }
}
