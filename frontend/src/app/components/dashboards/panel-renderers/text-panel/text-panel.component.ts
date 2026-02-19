import { CommonModule } from '@angular/common';
import { Component, computed, Input, signal } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { DashboardWidget } from 'src/app/models/dashboard';
import { SavedQuery } from 'src/app/models/saved-query';

@Component({
	selector: 'app-text-panel',
	templateUrl: './text-panel.component.html',
	styleUrls: ['./text-panel.component.css'],
	imports: [CommonModule, MarkdownModule],
})
export class TextPanelComponent {
	@Input({ required: true }) widget!: DashboardWidget;
	@Input() preloadedQuery: SavedQuery | null = null;

	protected textContent = computed(() => {
		const query = this.preloadedQuery;
		if (!query) return '';
		return (query.widget_options?.['text_content'] as string) || '';
	});
}
