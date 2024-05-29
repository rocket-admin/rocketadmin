import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-filter-json-editor',
  templateUrl: './json-editor.component.html',
  styleUrls: ['./json-editor.component.css']
})
export class JsonEditorFilterComponent extends BaseFilterFieldComponent {
  @Input() value: Object;

  ngOnInit(): void {
    super.ngOnInit();
    this.value = JSON.stringify(this.value, undefined, 4) || '';
  }
}
