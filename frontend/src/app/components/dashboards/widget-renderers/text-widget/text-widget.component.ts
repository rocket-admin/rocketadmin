import { CommonModule } from '@angular/common';
import { Component, computed, Input } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { DashboardWidget } from 'src/app/models/dashboard';

@Component({
	selector: 'app-text-widget',
	templateUrl: './text-widget.component.html',
	styleUrls: ['./text-widget.component.css'],
	imports: [CommonModule, MarkdownModule],
})
export class TextWidgetComponent {
	@Input({ required: true }) widget!: DashboardWidget;

	protected textContent = computed(() => {
		return (this.widget.widget_options?.['text_content'] as string) || '';
	});
}
