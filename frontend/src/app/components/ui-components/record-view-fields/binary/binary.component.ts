import { ClipboardModule } from '@angular/cdk/clipboard';
import { Component, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { bytesToEncoded, isBinaryEncoding, parseBinaryValue } from 'src/app/lib/binary';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

const MAX_DISPLAY_LENGTH = 80;

@Component({
	selector: 'app-binary-record-view',
	templateUrl: './binary.component.html',
	styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './binary.component.css'],
	imports: [ClipboardModule, MatButtonModule, MatIconModule, MatTooltipModule],
})
export class BinaryRecordViewComponent extends BaseRecordViewFieldComponent {
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

	public readonly isTruncated = computed(() => this.encodedValue().length > MAX_DISPLAY_LENGTH);
}
