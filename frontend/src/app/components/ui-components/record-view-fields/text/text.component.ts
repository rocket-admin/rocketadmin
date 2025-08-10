import { Component, Injectable } from '@angular/core';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Injectable()
@Component({
  selector: 'app-text-record-view',
  templateUrl: './text.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './text.component.css'],
  imports: []
})
export class TextRecordViewComponent extends BaseRecordViewFieldComponent {
}
