import { Component, OnInit } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Component({
	selector: 'app-markdown-record-view',
	templateUrl: './markdown.component.html',
	styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './markdown.component.css'],
	imports: [MarkdownModule],
})
export class MarkdownRecordViewComponent extends BaseRecordViewFieldComponent implements OnInit {
	public renderedMarkdown: string = '';

	ngOnInit(): void {
		this.renderedMarkdown = this.value() || '';
	}
}
