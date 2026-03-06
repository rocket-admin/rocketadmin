import { ClipboardModule } from '@angular/cdk/clipboard';
import { Component, Injectable } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';

@Injectable()
@Component({
	selector: 'app-display-id',
	templateUrl: './id.component.html',
	styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './id.component.css'],
	imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule],
})
export class IdDisplayComponent extends BaseTableDisplayFieldComponent {}
