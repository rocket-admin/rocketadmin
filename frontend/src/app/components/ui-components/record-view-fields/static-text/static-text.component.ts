import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { Component, Injectable } from '@angular/core';

@Injectable()
@Component({
  selector: 'app-static-text-record-view',
  templateUrl: './static-text.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './static-text.component.css'],
  imports: []
})
export class StaticTextRecordViewComponent extends BaseRecordViewFieldComponent {
}
