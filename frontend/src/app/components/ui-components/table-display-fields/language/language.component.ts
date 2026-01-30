import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TableField, WidgetStructure } from 'src/app/models/table';
import { getLanguageFlag, LANGUAGES } from '../../../../consts/languages';

@Component({
	selector: 'app-language-display',
	templateUrl: './language.component.html',
	styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './language.component.css'],
	imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule],
})
export class LanguageDisplayComponent {
	static type = 'language';

	readonly key = input<string>();
	readonly value = input<any>();
	readonly structure = input<TableField>();
	readonly widgetStructure = input<WidgetStructure>();
	readonly rowData = input<Record<string, unknown>>();
	readonly primaryKeys = input<{ column_name: string }[]>();

	readonly onCopyToClipboard = output<string>();

	readonly showFlag = computed(() => {
		const ws = this.widgetStructure();
		if (!ws?.widget_params) return true;
		try {
			const params = typeof ws.widget_params === 'string' ? JSON.parse(ws.widget_params) : ws.widget_params;
			return params.show_flag !== undefined ? params.show_flag : true;
		} catch {
			return true;
		}
	});

	readonly languageName = computed(() => {
		const val = this.value();
		if (!val) return '—';
		const language = LANGUAGES.find((l) => l.code.toLowerCase() === val.toLowerCase());
		return language ? language.name : val;
	});

	readonly languageFlag = computed(() => {
		const val = this.value();
		if (!val) return '';
		const language = LANGUAGES.find((l) => l.code.toLowerCase() === val.toLowerCase());
		return language ? getLanguageFlag(language) : '';
	});
}
