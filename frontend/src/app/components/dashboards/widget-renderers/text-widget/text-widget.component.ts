import { CommonModule } from '@angular/common';
import { Component, computed, Input, signal } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { DashboardWidget } from 'src/app/models/dashboard';
import { SavedQuery } from 'src/app/models/saved-query';

@Component({
	selector: 'app-text-widget',
	templateUrl: './text-widget.component.html',
	styleUrls: ['./text-widget.component.css'],
	imports: [CommonModule, MarkdownModule],
})
export class TextWidgetComponent {
	@Input({ required: true }) widget!: DashboardWidget;
	@Input() preloadedQuery: SavedQuery | null = null;

	protected textContent = computed(() => {
		const query = this.preloadedQuery;
		if (!query) return '';
		return (query.widget_options?.['text_content'] as string) || '';
	});
}
