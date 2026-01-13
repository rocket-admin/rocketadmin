import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { Component, Injectable, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';

@Injectable()
@Component({
  selector: 'app-markdown-record-view',
  templateUrl: './markdown.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './markdown.component.css'],
  imports: [CommonModule, MarkdownModule]
})
export class MarkdownRecordViewComponent extends BaseRecordViewFieldComponent implements OnInit {
  public renderedMarkdown: string = '';

  ngOnInit(): void {
    this.renderedMarkdown = this.value || '';
  }
}
