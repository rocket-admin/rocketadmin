import { ClipboardModule } from '@angular/cdk/clipboard';
import { Component, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { bytesToEncoded, isBinaryEncoding, parseBinaryValue } from 'src/app/lib/binary';
import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';

const MAX_DISPLAY_LENGTH = 20;

@Component({
	selector: 'app-binary-display',
	templateUrl: './binary.component.html',
	styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './binary.component.css'],
	imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule],
})
export class BinaryDisplayComponent extends BaseTableDisplayFieldComponent {
	public readonly bytes = computed(() => parseBinaryValue(this.value()));
	public readonly encoding = computed(() => {
		const raw = this.widgetStructure()?.widget_params?.encoding;
		return isBinaryEncoding(raw) ? raw : 'hex';
	});
	public readonly encodedValue = computed(() => bytesToEncoded(this.bytes(), this.encoding()));
	public readonly copyTooltip = computed(() => `Copy ${this.encoding()}`);

	public readonly displayText = computed(() => {
		const encoded = this.encodedValue();
		if (!encoded) return '—';
		return encoded.length > MAX_DISPLAY_LENGTH ? encoded.substring(0, MAX_DISPLAY_LENGTH) + '…' : encoded;
	});
}
