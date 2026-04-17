import { ClipboardModule } from '@angular/cdk/clipboard';
import { Component, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

const MAX_DISPLAY_LENGTH = 80;

@Component({
	selector: 'app-binary-record-view',
	templateUrl: './binary.component.html',
	styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './binary.component.css'],
	imports: [ClipboardModule, MatButtonModule, MatIconModule, MatTooltipModule],
})
export class BinaryRecordViewComponent extends BaseRecordViewFieldComponent {
	public readonly hexValue = computed(() => toHex(this.value()));

	public readonly displayText = computed(() => {
		const hex = this.hexValue();
		if (!hex) return '\u2014';
		return hex.length > MAX_DISPLAY_LENGTH ? hex.substring(0, MAX_DISPLAY_LENGTH) + '\u2026' : hex;
	});

	public readonly isTruncated = computed(() => this.hexValue().length > MAX_DISPLAY_LENGTH);
}

function toHex(value: unknown): string {
	if (value == null) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'object' && 'data' in (value as Record<string, unknown>)) {
		const data = (value as { data: unknown }).data;
		if (Array.isArray(data)) {
			return (data as number[]).map((b) => b.toString(16).padStart(2, '0')).join('');
		}
	}
	return '';
}
