import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ChartType } from 'src/app/models/saved-query';

@Component({
	selector: 'app-chart-mini-preview',
	templateUrl: './chart-mini-preview.component.html',
	styleUrls: ['./chart-mini-preview.component.css'],
	imports: [CommonModule],
})
export class ChartMiniPreviewComponent {
	@Input() chartType: ChartType | null = 'bar';

	get displayType(): ChartType {
		return this.chartType || 'bar';
	}
}
